-- =====================================================================
-- 002_equipe_fotos.sql — equipe com convite, permissões por barbeiro,
-- fotos e relatório por profissional
--
-- O que faz:
--   * profissionais ganham foto, título (Barbeiro/Barbeira) e bio
--   * barbearias ganham foto de capa e logo
--   * convites: o dono gera um link; o barbeiro cria a conta e entra na equipe
--   * permissões: o DONO mexe em tudo; o BARBEIRO só no que é dele
--     (seus horários, folgas, agendamentos, clientes e perfil)
--   * serviços, preços, promoções e dados da barbearia: só o dono
--   * relatorio_caixa ganha o parâmetro p_profissional (barbeiro só vê o dele)
--   * remover_da_equipe: o dono tira um barbeiro (o histórico fica)
--   * bucket público "fotos" no Storage, com regras de quem pode enviar
--
-- Idempotente: pode rodar de novo.
--
-- Como reverter (as permissões voltam às da 001 rodando a 001 de novo):
--   drop table if exists public.convites;
--   drop function if exists public.eh_dono, public.pode_profissional,
--     public.texto_para_uuid, public.ver_convite, public.aceitar_convite,
--     public.remover_da_equipe, public.proteger_profissional cascade;
--   drop function if exists public.relatorio_caixa(uuid, date, date, uuid);
--   alter table public.profissionais drop column if exists foto_url,
--     drop column if exists titulo, drop column if exists bio;
--   alter table public.barbearias drop column if exists capa_url,
--     drop column if exists logo_url;
--   alter table public.clientes drop column if exists criado_por;
--   -- depois rode a 001 de novo para recriar as regras antigas e o relatório
--   -- (e apague o bucket "fotos" no painel do Storage, se quiser)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Colunas novas
-- ---------------------------------------------------------------------
alter table public.profissionais add column if not exists foto_url text;
alter table public.profissionais add column if not exists titulo text not null default 'Barbeiro';
alter table public.profissionais add column if not exists bio text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profissionais_titulo_check') then
    alter table public.profissionais add constraint profissionais_titulo_check
      check (titulo in ('Barbeiro', 'Barbeira'));
  end if;
end $$;

alter table public.barbearias add column if not exists capa_url text;
alter table public.barbearias add column if not exists logo_url text;
grant update (capa_url, logo_url) on public.barbearias to authenticated;

-- quem cadastrou o cliente (para o barbeiro ver os clientes que ele mesmo cadastrou)
alter table public.clientes add column if not exists criado_por uuid default auth.uid()
  references auth.users(id) on delete set null;

-- ---------------------------------------------------------------------
-- Funções de permissão
-- ---------------------------------------------------------------------
create or replace function public.eh_dono(p_barbearia uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.membros
    where barbearia_id = p_barbearia and user_id = auth.uid() and papel = 'dono'
  );
$$;

-- Pode mexer nas coisas deste profissional? (o próprio barbeiro ou o dono)
create or replace function public.pode_profissional(p_profissional uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profissionais pr
    where pr.id = p_profissional
      and (pr.user_id = auth.uid() or public.eh_dono(pr.barbearia_id))
  );
$$;

create or replace function public.texto_para_uuid(t text)
returns uuid language plpgsql immutable as $$
begin
  return t::uuid;
exception when others then
  return null;
end $$;

-- Barbeiro não muda ativo/ordem/vínculo do próprio cadastro (só o dono)
create or replace function public.proteger_profissional()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.eh_dono(old.barbearia_id) then
    new.ativo := old.ativo;
    new.ordem := old.ordem;
    new.user_id := old.user_id;
    new.barbearia_id := old.barbearia_id;
  end if;
  return new;
end $$;
drop trigger if exists proteger_profissional on public.profissionais;
create trigger proteger_profissional before update on public.profissionais
  for each row execute function public.proteger_profissional();

-- ---------------------------------------------------------------------
-- Regras de acesso (substituem as da 001)
-- ---------------------------------------------------------------------
drop policy if exists barbearias_editar on public.barbearias;
create policy barbearias_editar on public.barbearias for update
  using (public.eh_dono(id) and public.barbearia_liberada(id))
  with check (public.eh_dono(id));

-- serviços e promoções: só o dono
do $$
declare t text;
begin
  foreach t in array array['servicos', 'promocoes'] loop
    execute format('drop policy if exists %I on public.%I', t || '_escrever', t);
    execute format(
      'create policy %I on public.%I for all using (public.eh_dono(barbearia_id) and public.barbearia_liberada(barbearia_id)) with check (public.eh_dono(barbearia_id) and public.barbearia_liberada(barbearia_id))',
      t || '_escrever', t);
  end loop;
end $$;

-- profissionais: dono cria/edita/apaga; o barbeiro edita o próprio perfil
drop policy if exists profissionais_escrever on public.profissionais;
create policy profissionais_escrever on public.profissionais for all
  using (public.eh_dono(barbearia_id) and public.barbearia_liberada(barbearia_id))
  with check (public.eh_dono(barbearia_id) and public.barbearia_liberada(barbearia_id));
drop policy if exists profissionais_proprio on public.profissionais;
create policy profissionais_proprio on public.profissionais for update
  using (user_id = auth.uid() and public.barbearia_liberada(barbearia_id))
  with check (user_id = auth.uid());

-- expediente e horários extras: do próprio profissional (ou dono)
do $$
declare t text;
begin
  foreach t in array array['horarios_semana', 'horarios_extras'] loop
    execute format('drop policy if exists %I on public.%I', t || '_escrever', t);
    execute format(
      'create policy %I on public.%I for all using (public.pode_profissional(profissional_id) and public.barbearia_liberada(barbearia_id)) with check (public.pode_profissional(profissional_id) and public.barbearia_liberada(barbearia_id))',
      t || '_escrever', t);
  end loop;
end $$;

-- folgas: dono vê e mexe em todas; barbeiro vê as gerais e as dele, e mexe só nas dele
drop policy if exists bloqueios_ver on public.bloqueios;
create policy bloqueios_ver on public.bloqueios for select
  using (
    public.eh_dono(barbearia_id)
    or (public.eh_membro(barbearia_id) and (profissional_id is null or public.pode_profissional(profissional_id)))
  );
drop policy if exists bloqueios_escrever on public.bloqueios;
create policy bloqueios_escrever on public.bloqueios for all
  using (
    public.barbearia_liberada(barbearia_id)
    and (public.eh_dono(barbearia_id) or (profissional_id is not null and public.pode_profissional(profissional_id)))
  )
  with check (
    public.barbearia_liberada(barbearia_id)
    and (public.eh_dono(barbearia_id) or (profissional_id is not null and public.pode_profissional(profissional_id)))
  );

-- agendamentos: dono vê todos; barbeiro só os dele; cliente só os seus
drop policy if exists agendamentos_ver on public.agendamentos;
create policy agendamentos_ver on public.agendamentos for select
  using (
    public.eh_dono(barbearia_id)
    or public.pode_profissional(profissional_id)
    or cliente_id in (select c.id from public.clientes c where c.user_id = auth.uid())
  );
drop policy if exists agendamentos_editar on public.agendamentos;
create policy agendamentos_editar on public.agendamentos for update
  using (public.pode_profissional(profissional_id) and public.barbearia_liberada(barbearia_id))
  with check (public.pode_profissional(profissional_id));
drop policy if exists agendamentos_apagar on public.agendamentos;
create policy agendamentos_apagar on public.agendamentos for delete
  using (public.pode_profissional(profissional_id) and public.barbearia_liberada(barbearia_id));

drop policy if exists itens_ver on public.agendamento_itens;
create policy itens_ver on public.agendamento_itens for select
  using (
    agendamento_id in (select a.id from public.agendamentos a)  -- herda a regra de agendamentos_ver
  );
drop policy if exists itens_escrever on public.agendamento_itens;
create policy itens_escrever on public.agendamento_itens for all
  using (
    public.barbearia_liberada(barbearia_id)
    and exists (select 1 from public.agendamentos a where a.id = agendamento_id and public.pode_profissional(a.profissional_id))
  )
  with check (
    public.barbearia_liberada(barbearia_id)
    and exists (select 1 from public.agendamentos a where a.id = agendamento_id and public.pode_profissional(a.profissional_id))
  );

-- clientes: dono vê todos; barbeiro vê os que cadastrou ou que já marcaram com ele
create or replace function public.cliente_visivel(p_cliente uuid, p_barbearia uuid, p_criado_por uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.eh_dono(p_barbearia)
    or (public.eh_membro(p_barbearia) and (
      p_criado_por = auth.uid()
      or exists (
        select 1 from public.agendamentos a
        join public.profissionais pr on pr.id = a.profissional_id
        where a.cliente_id = p_cliente and pr.user_id = auth.uid()
      )
    ));
$$;

drop policy if exists clientes_ver on public.clientes;
create policy clientes_ver on public.clientes for select
  using (user_id = auth.uid() or public.cliente_visivel(id, barbearia_id, criado_por));
drop policy if exists clientes_escrever on public.clientes;
drop policy if exists clientes_inserir on public.clientes;
create policy clientes_inserir on public.clientes for insert
  with check (public.eh_membro(barbearia_id) and public.barbearia_liberada(barbearia_id));
drop policy if exists clientes_alterar on public.clientes;
create policy clientes_alterar on public.clientes for update
  using (public.cliente_visivel(id, barbearia_id, criado_por) and public.barbearia_liberada(barbearia_id))
  with check (public.eh_membro(barbearia_id));
drop policy if exists clientes_apagar on public.clientes;
create policy clientes_apagar on public.clientes for delete
  using (public.eh_dono(barbearia_id) and public.barbearia_liberada(barbearia_id));

-- ---------------------------------------------------------------------
-- Convites
-- ---------------------------------------------------------------------
create table if not exists public.convites (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references public.barbearias(id) on delete cascade,
  codigo uuid not null unique default gen_random_uuid(),
  profissional_id uuid references public.profissionais(id) on delete cascade,
  criado_por uuid references auth.users(id) on delete set null default auth.uid(),
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null default now() + interval '7 days',
  usado_em timestamptz,
  usado_por uuid references auth.users(id) on delete set null
);
alter table public.convites enable row level security;
drop policy if exists convites_dono on public.convites;
create policy convites_dono on public.convites for all
  using (public.eh_dono(barbearia_id) and public.barbearia_liberada(barbearia_id))
  with check (public.eh_dono(barbearia_id) and public.barbearia_liberada(barbearia_id));

create or replace function public.ver_convite(p_codigo uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'barbearia', b.nome,
    'slug', b.slug,
    'valido', c.usado_em is null and c.expira_em > now() and public.barbearia_liberada(b.id),
    'usado', c.usado_em is not null,
    'nome_sugerido', p.nome
  )
  from public.convites c
  join public.barbearias b on b.id = c.barbearia_id
  left join public.profissionais p on p.id = c.profissional_id
  where c.codigo = p_codigo;
$$;

create or replace function public.aceitar_convite(p_codigo uuid, p_nome text, p_titulo text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  c public.convites%rowtype;
  v_prof uuid;
  d int;
begin
  if v_uid is null then raise exception 'Entre na sua conta para aceitar o convite.'; end if;
  if nullif(trim(p_nome), '') is null then raise exception 'Informe seu nome completo.'; end if;
  if p_titulo not in ('Barbeiro', 'Barbeira') then raise exception 'Escolha Barbeiro ou Barbeira.'; end if;

  select * into c from public.convites where codigo = p_codigo for update;
  if not found then raise exception 'Convite não encontrado.'; end if;
  if c.usado_em is not null then raise exception 'Este convite já foi usado. Peça um novo ao dono da barbearia.'; end if;
  if c.expira_em < now() then raise exception 'Este convite expirou. Peça um novo ao dono da barbearia.'; end if;
  if exists (select 1 from public.membros where barbearia_id = c.barbearia_id and user_id = v_uid) then
    raise exception 'Você já faz parte desta barbearia.';
  end if;

  insert into public.membros (barbearia_id, user_id, papel) values (c.barbearia_id, v_uid, 'barbeiro');

  if c.profissional_id is not null then
    update public.profissionais
       set user_id = v_uid, nome = trim(p_nome), titulo = p_titulo, ativo = true
     where id = c.profissional_id and user_id is null
    returning id into v_prof;
  end if;

  if v_prof is null then
    insert into public.profissionais (barbearia_id, nome, titulo, user_id, ordem)
    values (c.barbearia_id, trim(p_nome), p_titulo, v_uid,
            coalesce((select max(ordem) + 1 from public.profissionais where barbearia_id = c.barbearia_id), 0))
    returning id into v_prof;
    -- expediente inicial (o barbeiro ajusta depois): terça a sábado, 9h–12h e 13h–19h
    for d in 2..6 loop
      insert into public.horarios_semana (barbearia_id, profissional_id, dia_semana, inicio, fim)
      values (c.barbearia_id, v_prof, d, '09:00', '12:00'), (c.barbearia_id, v_prof, d, '13:00', '19:00');
    end loop;
  end if;

  update public.convites set usado_em = now(), usado_por = v_uid where id = c.id;
  return c.barbearia_id;
end $$;

-- Dono tira o barbeiro da equipe: perde o acesso; o cadastro e o histórico ficam (inativo)
create or replace function public.remover_da_equipe(p_profissional uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  pr public.profissionais%rowtype;
begin
  select * into pr from public.profissionais where id = p_profissional;
  if not found or not public.eh_dono(pr.barbearia_id) then raise exception 'Sem acesso.'; end if;
  if pr.user_id is not null and exists (
    select 1 from public.membros where barbearia_id = pr.barbearia_id and user_id = pr.user_id and papel = 'dono'
  ) then
    raise exception 'O dono não pode ser removido da equipe.';
  end if;
  delete from public.membros where barbearia_id = pr.barbearia_id and user_id = pr.user_id and papel = 'barbeiro';
  update public.profissionais set ativo = false, user_id = null where id = pr.id;
end $$;

-- ---------------------------------------------------------------------
-- Agendamento pelo painel: barbeiro só na própria agenda
-- ---------------------------------------------------------------------
create or replace function public.agendar_pelo_painel(
  p_barbearia uuid, p_profissional uuid, p_inicio timestamptz, p_servicos uuid[],
  p_cliente uuid default null, p_nome text default null, p_telefone text default null,
  p_observacoes text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_cliente uuid := p_cliente;
begin
  if not public.eh_membro(p_barbearia) then raise exception 'Sem acesso a esta barbearia.'; end if;
  if not (public.eh_dono(p_barbearia) or public.pode_profissional(p_profissional)) then
    raise exception 'Você só pode marcar horários na sua própria agenda.';
  end if;
  if not public.barbearia_liberada(p_barbearia) then
    raise exception 'Assinatura pausada. Regularize para voltar a agendar.';
  end if;

  if v_cliente is null then
    if nullif(trim(p_nome), '') is null then raise exception 'Informe o nome do cliente.'; end if;
    insert into public.clientes (barbearia_id, nome, telefone, criado_por)
    values (p_barbearia, trim(p_nome),
            nullif(regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g'), ''), auth.uid())
    returning id into v_cliente;
  elsif not exists (select 1 from public.clientes where id = v_cliente and barbearia_id = p_barbearia) then
    raise exception 'Cliente não encontrado.';
  end if;

  return public._criar_agendamento(p_barbearia, p_profissional, v_cliente, p_inicio, p_servicos, 'painel', p_observacoes);
end $$;

-- ---------------------------------------------------------------------
-- Relatório por profissional
-- ---------------------------------------------------------------------
drop function if exists public.relatorio_caixa(uuid, date, date);
create or replace function public.relatorio_caixa(p_barbearia uuid, p_de date, p_ate date, p_profissional uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_fuso text;
  v_prof uuid := p_profissional;
  r jsonb;
begin
  if not public.eh_membro(p_barbearia) then raise exception 'Sem acesso a esta barbearia.'; end if;
  if not public.eh_dono(p_barbearia) then
    -- barbeiro: sempre o próprio relatório
    select id into v_prof from public.profissionais where barbearia_id = p_barbearia and user_id = auth.uid() limit 1;
    if v_prof is null then raise exception 'Sem acesso a esta barbearia.'; end if;
  end if;
  select fuso into v_fuso from public.barbearias where id = p_barbearia;

  with ag as (
    select a.* from public.agendamentos a
    where a.barbearia_id = p_barbearia
      and (v_prof is null or a.profissional_id = v_prof)
      and (a.inicio at time zone v_fuso)::date between p_de and p_ate
  ),
  it as (
    select i.*, ag.forma_pagamento, ag.profissional_id, (ag.inicio at time zone v_fuso)::date as dia
    from public.agendamento_itens i join ag on ag.id = i.agendamento_id
    where ag.status = 'concluido'
  )
  select jsonb_build_object(
    'de', p_de, 'ate', p_ate, 'profissional', v_prof,
    'atendimentos', (select count(*) from ag where status = 'concluido'),
    'faltas', (select count(*) from ag where status = 'faltou'),
    'cancelados', (select count(*) from ag where status = 'cancelado'),
    'sem_fechamento', (select count(*) from ag where status in ('agendado', 'confirmado') and fim < now()),
    'total', (select coalesce(sum(preco_cobrado), 0) from it),
    'total_tabela', (select coalesce(sum(preco_tabela), 0) from it),
    'qtd_promocoes', (select count(*) from it where promocao or preco_cobrado < preco_tabela),
    'por_categoria', (select coalesce(jsonb_agg(x order by x.valor desc), '[]'::jsonb) from (
        select categoria, count(*) as qtd, sum(preco_cobrado) as valor from it group by categoria) x),
    'por_servico', (select coalesce(jsonb_agg(x order by x.qtd desc, x.nome), '[]'::jsonb) from (
        select nome, count(*) as qtd, sum(preco_cobrado) as valor,
               count(*) filter (where promocao or preco_cobrado < preco_tabela) as promocoes
        from it group by nome) x),
    'por_pagamento', (select coalesce(jsonb_agg(x order by x.valor desc), '[]'::jsonb) from (
        select coalesce(forma_pagamento, 'nao_informado') as forma,
               count(distinct agendamento_id) as qtd, sum(preco_cobrado) as valor
        from it group by 1) x),
    'por_profissional', (select coalesce(jsonb_agg(x order by x.valor desc), '[]'::jsonb) from (
        select p.id, p.nome, count(distinct it.agendamento_id) as qtd, sum(it.preco_cobrado) as valor
        from it join public.profissionais p on p.id = it.profissional_id group by p.id, p.nome) x),
    'por_dia', (select coalesce(jsonb_agg(x order by x.dia), '[]'::jsonb) from (
        select dia, count(distinct agendamento_id) as qtd, sum(preco_cobrado) as valor
        from it group by dia) x)
  ) into r;
  return r;
end $$;

-- ---------------------------------------------------------------------
-- Fotos (Storage). Caminho: <barbearia>/<profissional | capa | logo>/<arquivo>
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create or replace function public.pode_enviar_foto(p_caminho text)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    public.eh_dono(public.texto_para_uuid(split_part(p_caminho, '/', 1)))
    or (
      public.texto_para_uuid(split_part(p_caminho, '/', 2)) is not null
      and exists (
        select 1 from public.profissionais pr
        where pr.id = public.texto_para_uuid(split_part(p_caminho, '/', 2))
          and pr.barbearia_id = public.texto_para_uuid(split_part(p_caminho, '/', 1))
          and pr.user_id = auth.uid()
      )
    )
  );
$$;

-- leitura: o bucket já é público; a regra é necessária para enviar/substituir arquivo
drop policy if exists fotos_ver on storage.objects;
create policy fotos_ver on storage.objects for select using (bucket_id = 'fotos');
drop policy if exists fotos_enviar on storage.objects;
create policy fotos_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and public.pode_enviar_foto(name));
drop policy if exists fotos_trocar on storage.objects;
create policy fotos_trocar on storage.objects for update to authenticated
  using (bucket_id = 'fotos' and public.pode_enviar_foto(name));
drop policy if exists fotos_apagar on storage.objects;
create policy fotos_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and public.pode_enviar_foto(name));

-- ---------------------------------------------------------------------
-- Quem pode chamar
-- ---------------------------------------------------------------------
revoke execute on function public.aceitar_convite(uuid, text, text) from public, anon;
revoke execute on function public.remover_da_equipe(uuid) from public, anon;
revoke execute on function public.relatorio_caixa(uuid, date, date, uuid) from public, anon;
grant execute on function public.aceitar_convite(uuid, text, text) to authenticated;
grant execute on function public.remover_da_equipe(uuid) to authenticated;
grant execute on function public.relatorio_caixa(uuid, date, date, uuid) to authenticated;
grant execute on function public.ver_convite(uuid) to anon, authenticated;
