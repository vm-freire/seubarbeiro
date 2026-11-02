-- =====================================================================
-- 003_servicos_profissional_lembrete.sql — serviços por profissional e
-- "Vou / Não vou" liberado só perto do horário
--
-- O que faz:
--   * profissional_nao_faz: o dono marca os serviços que cada profissional
--     NÃO faz. Sem marcação = faz todos (serviço novo vale para todos).
--     O cliente não consegue agendar com quem não faz o serviço (o banco
--     recusa). Pelo painel, a equipe continua podendo lançar qualquer serviço.
--   * lembrete: o padrão passa a ser 60 min antes (barbearias que estavam
--     no padrão antigo de 30 min passam para 60).
--   * confirmacao_ver devolve também lembrete_minutos e criado_em.
--   * confirmacao_responder: "Vou" só é aceito a partir do horário do
--     lembrete (antes disso o link ainda não vale). "Não vou" segue
--     funcionando, para o horário ser liberado.
--
-- Idempotente: pode rodar de novo.
--
-- Como reverter:
--   drop trigger if exists itens_servico_do_profissional on public.agendamento_itens;
--   drop function if exists public.conferir_servico_do_profissional();
--   drop table if exists public.profissional_nao_faz;
--   alter table public.barbearias alter column lembrete_minutos set default 30;
--   -- e rode de novo, da 001, as funções confirmacao_ver e confirmacao_responder
-- =====================================================================

-- ---------------------------------------------------------------------
-- Serviços que cada profissional não faz
-- ---------------------------------------------------------------------
create table if not exists public.profissional_nao_faz (
  profissional_id uuid not null references public.profissionais(id) on delete cascade,
  servico_id uuid not null references public.servicos(id) on delete cascade,
  barbearia_id uuid not null references public.barbearias(id) on delete cascade,
  primary key (profissional_id, servico_id)
);
create index if not exists profissional_nao_faz_barbearia on public.profissional_nao_faz (barbearia_id);

alter table public.profissional_nao_faz enable row level security;

-- o cliente precisa ler para a tela de agendamento mostrar só o que cada um faz
drop policy if exists profissional_nao_faz_ver on public.profissional_nao_faz;
create policy profissional_nao_faz_ver on public.profissional_nao_faz for select using (true);

drop policy if exists profissional_nao_faz_escrever on public.profissional_nao_faz;
create policy profissional_nao_faz_escrever on public.profissional_nao_faz for all
  using (public.eh_dono(barbearia_id) and public.barbearia_liberada(barbearia_id))
  with check (
    public.eh_dono(barbearia_id) and public.barbearia_liberada(barbearia_id)
    and exists (select 1 from public.profissionais p where p.id = profissional_id and p.barbearia_id = profissional_nao_faz.barbearia_id)
    and exists (select 1 from public.servicos s where s.id = servico_id and s.barbearia_id = profissional_nao_faz.barbearia_id)
  );

-- Agendamento feito pelo cliente: recusa serviço que o profissional não faz.
-- (Quem é da equipe, pelo painel, pode lançar qualquer serviço.)
create or replace function public.conferir_servico_do_profissional()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_prof uuid;
  v_nome_prof text;
begin
  if new.servico_id is null or public.eh_membro(new.barbearia_id) then
    return new;
  end if;
  select a.profissional_id into v_prof from public.agendamentos a where a.id = new.agendamento_id;
  if exists (
    select 1 from public.profissional_nao_faz n
    where n.profissional_id = v_prof and n.servico_id = new.servico_id
  ) then
    select nome into v_nome_prof from public.profissionais where id = v_prof;
    raise exception '% não faz o serviço "%". Escolha outro profissional ou outro serviço.', v_nome_prof, new.nome;
  end if;
  return new;
end $$;

drop trigger if exists itens_servico_do_profissional on public.agendamento_itens;
create trigger itens_servico_do_profissional before insert on public.agendamento_itens
  for each row execute function public.conferir_servico_do_profissional();

-- ---------------------------------------------------------------------
-- Lembrete: 60 min por padrão
-- ---------------------------------------------------------------------
alter table public.barbearias alter column lembrete_minutos set default 60;
update public.barbearias set lembrete_minutos = 60 where lembrete_minutos = 30;

-- ---------------------------------------------------------------------
-- Página do horário (/c/<código>)
-- ---------------------------------------------------------------------
create or replace function public.confirmacao_ver(p_token uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'status', a.status,
    'inicio', a.inicio,
    'fim', a.fim,
    'criado_em', a.criado_em,
    'cliente', split_part(c.nome, ' ', 1),
    'profissional', p.nome,
    'servicos', (select coalesce(jsonb_agg(i.nome order by i.nome), '[]'::jsonb)
                 from public.agendamento_itens i where i.agendamento_id = a.id),
    'barbearia', jsonb_build_object(
      'nome', b.nome, 'slug', b.slug, 'endereco', b.endereco, 'cidade', b.cidade,
      'maps_url', b.maps_url, 'whatsapp', b.whatsapp, 'fuso', b.fuso,
      'lembrete_minutos', b.lembrete_minutos)
  )
  from public.agendamentos a
  join public.clientes c on c.id = a.cliente_id
  join public.profissionais p on p.id = a.profissional_id
  join public.barbearias b on b.id = a.barbearia_id
  where a.token_confirmacao = p_token;
$$;

create or replace function public.confirmacao_responder(p_token uuid, p_vai boolean)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_status text;
  v_libera timestamptz;
begin
  if p_vai then
    select a.inicio - make_interval(mins => b.lembrete_minutos) into v_libera
    from public.agendamentos a join public.barbearias b on b.id = a.barbearia_id
    where a.token_confirmacao = p_token
      and a.status in ('agendado', 'confirmado') and a.fim > now();
    if v_libera is not null and now() < v_libera then
      raise exception 'A confirmação abre % antes do horário. Volte mais perto da hora.',
        (select case when b.lembrete_minutos % 60 = 0 then (b.lembrete_minutos / 60) || ' hora(s)'
                     else b.lembrete_minutos || ' minutos' end
         from public.agendamentos a join public.barbearias b on b.id = a.barbearia_id
         where a.token_confirmacao = p_token);
    end if;
  end if;

  update public.agendamentos
     set status = case when p_vai then 'confirmado' else 'cancelado' end,
         cancelado_por = case when p_vai then null else 'cliente' end,
         respondido_em = now()
   where token_confirmacao = p_token
     and status in ('agendado', 'confirmado')
     and fim > now()
  returning status into v_status;
  if v_status is null then
    raise exception 'Este horário não pode mais ser alterado por aqui. Fale com a barbearia.';
  end if;
  return v_status;
end $$;

grant execute on function public.confirmacao_ver(uuid) to anon, authenticated;
grant execute on function public.confirmacao_responder(uuid, boolean) to anon, authenticated;
grant select on public.profissional_nao_faz to anon, authenticated;
grant insert, update, delete on public.profissional_nao_faz to authenticated;
