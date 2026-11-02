-- =====================================================================
-- 001_inicial.sql — estrutura inicial do sistema de barbearias
--
-- O que faz:
--   * perfis (nome/telefone de quem cria conta) + gatilho de cadastro
--   * barbearias (várias, cada uma com seu link /b/<slug>), membros,
--     profissionais, serviços, promoções
--   * agenda: horários da semana, bloqueios (folgas), horários extras
--   * clientes, agendamentos e itens (serviços de cada agendamento)
--   * trava no banco contra dois agendamentos no mesmo horário
--   * funções (RPC): criar_barbearia, agendar, agendar_pelo_painel,
--     horarios_ocupados, cancelar_agendamento_cliente,
--     confirmacao_ver, confirmacao_responder, relatorio_caixa
--   * assinatura: barbearia "suspensa"/"cancelada" (ou vencida) não
--     recebe agendamentos e não consegue editar nada no painel.
--
-- Idempotente: pode rodar de novo sem erro.
--
-- Como reverter (APAGA TODOS OS DADOS do sistema):
--   drop table if exists public.agendamento_itens, public.agendamentos,
--     public.clientes, public.horarios_extras, public.bloqueios,
--     public.horarios_semana, public.promocoes, public.servicos,
--     public.profissionais, public.membros, public.barbearias,
--     public.perfis cascade;
--   drop trigger if exists ao_criar_usuario on auth.users;
--   drop function if exists public.criar_perfil, public.eh_membro,
--     public.barbearia_liberada, public.preco_servico,
--     public._criar_agendamento, public.criar_barbearia, public.agendar,
--     public.agendar_pelo_painel, public.horarios_ocupados,
--     public.cancelar_agendamento_cliente, public.confirmacao_ver,
--     public.confirmacao_responder, public.relatorio_caixa,
--     public.limite_agenda cascade;
-- =====================================================================

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------
-- Perfis
-- ---------------------------------------------------------------------
create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '',
  telefone text,
  criado_em timestamptz not null default now()
);

create or replace function public.criar_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, nome, telefone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', ''),
    nullif(regexp_replace(coalesce(new.raw_user_meta_data->>'telefone', ''), '\D', '', 'g'), '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario after insert on auth.users
  for each row execute function public.criar_perfil();

-- ---------------------------------------------------------------------
-- Barbearias e membros
-- ---------------------------------------------------------------------
create table if not exists public.barbearias (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 40),
  nome text not null check (length(nome) between 2 and 80),
  descricao text,
  endereco text,
  cidade text,
  maps_url text,
  whatsapp text,              -- só dígitos, com 55 na frente
  instagram text,
  fuso text not null default 'America/Sao_Paulo',
  passo_minutos int not null default 30 check (passo_minutos in (10, 15, 20, 30, 45, 60)),
  antecedencia_minima_min int not null default 60 check (antecedencia_minima_min between 0 and 2880),
  dias_agenda_aberta int not null default 14 check (dias_agenda_aberta between 1 and 120),
  agenda_aberta_ate date,     -- se preenchido, o cliente não agenda depois desse dia
  lembrete_minutos int not null default 30 check (lembrete_minutos between 10 and 1440),
  -- Assinatura (só o dono da plataforma muda, pelo SQL Editor ou futuramente pelo /admin)
  plano text not null default 'teste',
  assinatura_status text not null default 'teste'
    check (assinatura_status in ('teste', 'ativa', 'atrasada', 'suspensa', 'cancelada')),
  assinatura_valida_ate date,
  dono_id uuid not null references auth.users(id),
  criado_em timestamptz not null default now()
);

create table if not exists public.membros (
  barbearia_id uuid not null references public.barbearias(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  papel text not null default 'barbeiro' check (papel in ('dono', 'barbeiro')),
  criado_em timestamptz not null default now(),
  primary key (barbearia_id, user_id)
);

create or replace function public.eh_membro(p_barbearia uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.membros where barbearia_id = p_barbearia and user_id = auth.uid()
  );
$$;

-- Liberada = em teste ou ativa, e (sem vencimento ou vencida há no máximo 3 dias).
-- "atrasada" também tem os 3 dias de tolerância a partir do vencimento.
create or replace function public.barbearia_liberada(p_barbearia uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select case
      when assinatura_status in ('teste', 'ativa') then
        assinatura_valida_ate is null or assinatura_valida_ate + 3 >= current_date
      when assinatura_status = 'atrasada' then
        assinatura_valida_ate is not null and assinatura_valida_ate + 3 >= current_date
      else false
    end
    from public.barbearias where id = p_barbearia
  ), false);
$$;

-- ---------------------------------------------------------------------
-- Profissionais, serviços, promoções
-- ---------------------------------------------------------------------
create table if not exists public.profissionais (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references public.barbearias(id) on delete cascade,
  nome text not null check (length(nome) between 1 and 60),
  user_id uuid references auth.users(id) on delete set null,
  ativo boolean not null default true,
  ordem int not null default 0,
  criado_em timestamptz not null default now()
);
create index if not exists profissionais_barbearia on public.profissionais (barbearia_id);

create table if not exists public.servicos (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references public.barbearias(id) on delete cascade,
  nome text not null check (length(nome) between 1 and 60),
  descricao text,
  categoria text not null default 'corte'
    check (categoria in ('corte', 'barba', 'sobrancelha', 'combo', 'outro')),
  preco numeric(10, 2) not null default 0 check (preco >= 0),
  duracao_min int not null default 30 check (duracao_min between 5 and 480),
  ativo boolean not null default true,
  ordem int not null default 0,
  criado_em timestamptz not null default now()
);
create index if not exists servicos_barbearia on public.servicos (barbearia_id);

create table if not exists public.promocoes (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references public.barbearias(id) on delete cascade,
  servico_id uuid not null references public.servicos(id) on delete cascade,
  nome text not null default 'Promoção',
  preco numeric(10, 2) not null check (preco >= 0),
  dias_semana smallint[],     -- 0 = domingo ... 6 = sábado; null = todos os dias
  data_inicio date,
  data_fim date,
  ativa boolean not null default true,
  criado_em timestamptz not null default now()
);
create index if not exists promocoes_servico on public.promocoes (servico_id);

-- Menor preço válido para o serviço no dia (tabela ou promoção).
create or replace function public.preco_servico(p_servico uuid, p_dia date)
returns table (preco numeric, preco_tabela numeric, promocao_nome text)
language sql stable security definer set search_path = public as $$
  select
    coalesce(least(s.preco, p.preco), s.preco),
    s.preco,
    case when p.preco is not null and p.preco < s.preco then p.nome end
  from public.servicos s
  left join lateral (
    select pr.preco, pr.nome from public.promocoes pr
    where pr.servico_id = s.id and pr.ativa
      and (pr.data_inicio is null or p_dia >= pr.data_inicio)
      and (pr.data_fim is null or p_dia <= pr.data_fim)
      and (pr.dias_semana is null or extract(dow from p_dia)::smallint = any (pr.dias_semana))
    order by pr.preco asc
    limit 1
  ) p on true
  where s.id = p_servico;
$$;

-- ---------------------------------------------------------------------
-- Agenda do profissional
-- ---------------------------------------------------------------------
create table if not exists public.horarios_semana (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references public.barbearias(id) on delete cascade,
  profissional_id uuid not null references public.profissionais(id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 0 and 6),
  inicio time not null,
  fim time not null,
  check (fim > inicio)
);
create index if not exists horarios_semana_prof on public.horarios_semana (profissional_id, dia_semana);

-- Folgas / horários fechados. profissional_id nulo = a barbearia toda.
create table if not exists public.bloqueios (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references public.barbearias(id) on delete cascade,
  profissional_id uuid references public.profissionais(id) on delete cascade,
  inicio timestamptz not null,
  fim timestamptz not null,
  motivo text,
  criado_em timestamptz not null default now(),
  check (fim > inicio)
);
create index if not exists bloqueios_barbearia on public.bloqueios (barbearia_id, inicio);

-- Horários abertos fora do expediente normal.
create table if not exists public.horarios_extras (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references public.barbearias(id) on delete cascade,
  profissional_id uuid not null references public.profissionais(id) on delete cascade,
  inicio timestamptz not null,
  fim timestamptz not null,
  criado_em timestamptz not null default now(),
  check (fim > inicio)
);
create index if not exists horarios_extras_barbearia on public.horarios_extras (barbearia_id, inicio);

-- ---------------------------------------------------------------------
-- Clientes e agendamentos
-- ---------------------------------------------------------------------
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references public.barbearias(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  nome text not null check (length(nome) between 1 and 80),
  telefone text,
  email text,
  observacoes text,
  criado_em timestamptz not null default now(),
  unique (barbearia_id, user_id)
);
create index if not exists clientes_barbearia_nome on public.clientes (barbearia_id, nome);

create table if not exists public.agendamentos (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references public.barbearias(id) on delete cascade,
  profissional_id uuid not null references public.profissionais(id) on delete restrict,
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  inicio timestamptz not null,
  fim timestamptz not null,
  -- agendado = ainda não respondeu (amarelo); confirmado = disse que vai (verde)
  status text not null default 'agendado'
    check (status in ('agendado', 'confirmado', 'cancelado', 'concluido', 'faltou')),
  origem text not null default 'site' check (origem in ('site', 'painel', 'whatsapp')),
  token_confirmacao uuid not null unique default gen_random_uuid(),
  respondido_em timestamptz,
  lembrete_enviado_em timestamptz,
  cancelado_por text check (cancelado_por in ('cliente', 'barbearia')),
  forma_pagamento text check (forma_pagamento in ('pix', 'debito', 'credito', 'dinheiro', 'outro')),
  pagamento_obs text,
  observacoes text,
  criado_em timestamptz not null default now(),
  check (fim > inicio)
);
create index if not exists agendamentos_barbearia_inicio on public.agendamentos (barbearia_id, inicio);
create index if not exists agendamentos_cliente on public.agendamentos (cliente_id);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'agendamentos_sem_sobreposicao') then
    alter table public.agendamentos add constraint agendamentos_sem_sobreposicao
      exclude using gist (profissional_id with =, tstzrange(inicio, fim, '[)') with &&)
      where (status in ('agendado', 'confirmado', 'concluido'));
  end if;
end $$;

create table if not exists public.agendamento_itens (
  id uuid primary key default gen_random_uuid(),
  agendamento_id uuid not null references public.agendamentos(id) on delete cascade,
  barbearia_id uuid not null references public.barbearias(id) on delete cascade,
  servico_id uuid references public.servicos(id) on delete set null,
  nome text not null,
  categoria text not null default 'outro'
    check (categoria in ('corte', 'barba', 'sobrancelha', 'combo', 'outro')),
  preco_tabela numeric(10, 2) not null default 0,
  preco_cobrado numeric(10, 2) not null default 0 check (preco_cobrado >= 0),
  promocao boolean not null default false,
  promocao_nome text
);
create index if not exists agendamento_itens_ag on public.agendamento_itens (agendamento_id);

-- ---------------------------------------------------------------------
-- Permissões (RLS)
-- ---------------------------------------------------------------------
alter table public.perfis enable row level security;
alter table public.barbearias enable row level security;
alter table public.membros enable row level security;
alter table public.profissionais enable row level security;
alter table public.servicos enable row level security;
alter table public.promocoes enable row level security;
alter table public.horarios_semana enable row level security;
alter table public.bloqueios enable row level security;
alter table public.horarios_extras enable row level security;
alter table public.clientes enable row level security;
alter table public.agendamentos enable row level security;
alter table public.agendamento_itens enable row level security;

-- perfis: cada um vê e edita o seu
drop policy if exists perfis_ver on public.perfis;
create policy perfis_ver on public.perfis for select using (id = auth.uid());
drop policy if exists perfis_editar on public.perfis;
create policy perfis_editar on public.perfis for update using (id = auth.uid()) with check (id = auth.uid());

-- barbearias: página pública; criar só pela função; editar só membros e só colunas permitidas
drop policy if exists barbearias_ver on public.barbearias;
create policy barbearias_ver on public.barbearias for select using (true);
drop policy if exists barbearias_editar on public.barbearias;
create policy barbearias_editar on public.barbearias for update
  using (public.eh_membro(id) and public.barbearia_liberada(id))
  with check (public.eh_membro(id));
revoke insert, update, delete on public.barbearias from anon, authenticated;
grant update (nome, slug, descricao, endereco, cidade, maps_url, whatsapp, instagram,
  passo_minutos, antecedencia_minima_min, dias_agenda_aberta, agenda_aberta_ate,
  lembrete_minutos) on public.barbearias to authenticated;

-- membros: cada membro vê a equipe da sua barbearia
drop policy if exists membros_ver on public.membros;
create policy membros_ver on public.membros for select using (public.eh_membro(barbearia_id));
revoke insert, update, delete on public.membros from anon, authenticated;

-- Tabelas de configuração: leitura pública, escrita só de membro com assinatura liberada
do $$
declare t text;
begin
  foreach t in array array['profissionais', 'servicos', 'promocoes', 'horarios_semana', 'horarios_extras'] loop
    execute format('drop policy if exists %I on public.%I', t || '_ver', t);
    execute format('create policy %I on public.%I for select using (true)', t || '_ver', t);
    execute format('drop policy if exists %I on public.%I', t || '_escrever', t);
    execute format(
      'create policy %I on public.%I for all using (public.eh_membro(barbearia_id) and public.barbearia_liberada(barbearia_id)) with check (public.eh_membro(barbearia_id) and public.barbearia_liberada(barbearia_id))',
      t || '_escrever', t);
  end loop;
end $$;

-- bloqueios: o motivo é privado; o público vê os horários só pela função horarios_ocupados
drop policy if exists bloqueios_ver on public.bloqueios;
create policy bloqueios_ver on public.bloqueios for select using (public.eh_membro(barbearia_id));
drop policy if exists bloqueios_escrever on public.bloqueios;
create policy bloqueios_escrever on public.bloqueios for all
  using (public.eh_membro(barbearia_id) and public.barbearia_liberada(barbearia_id))
  with check (public.eh_membro(barbearia_id) and public.barbearia_liberada(barbearia_id));

-- clientes: membro vê e edita os da barbearia; o cliente vê o próprio cadastro
drop policy if exists clientes_ver on public.clientes;
create policy clientes_ver on public.clientes for select
  using (public.eh_membro(barbearia_id) or user_id = auth.uid());
drop policy if exists clientes_escrever on public.clientes;
create policy clientes_escrever on public.clientes for all
  using (public.eh_membro(barbearia_id) and public.barbearia_liberada(barbearia_id))
  with check (public.eh_membro(barbearia_id) and public.barbearia_liberada(barbearia_id));

-- agendamentos: criar só pelas funções; membro altera/apaga; cliente só vê os seus
drop policy if exists agendamentos_ver on public.agendamentos;
create policy agendamentos_ver on public.agendamentos for select
  using (
    public.eh_membro(barbearia_id)
    or cliente_id in (select c.id from public.clientes c where c.user_id = auth.uid())
  );
drop policy if exists agendamentos_editar on public.agendamentos;
create policy agendamentos_editar on public.agendamentos for update
  using (public.eh_membro(barbearia_id) and public.barbearia_liberada(barbearia_id))
  with check (public.eh_membro(barbearia_id));
drop policy if exists agendamentos_apagar on public.agendamentos;
create policy agendamentos_apagar on public.agendamentos for delete
  using (public.eh_membro(barbearia_id) and public.barbearia_liberada(barbearia_id));
revoke insert on public.agendamentos from anon, authenticated;

drop policy if exists itens_ver on public.agendamento_itens;
create policy itens_ver on public.agendamento_itens for select
  using (
    public.eh_membro(barbearia_id)
    or agendamento_id in (
      select a.id from public.agendamentos a
      join public.clientes c on c.id = a.cliente_id
      where c.user_id = auth.uid()
    )
  );
drop policy if exists itens_escrever on public.agendamento_itens;
create policy itens_escrever on public.agendamento_itens for all
  using (public.eh_membro(barbearia_id) and public.barbearia_liberada(barbearia_id))
  with check (public.eh_membro(barbearia_id) and public.barbearia_liberada(barbearia_id));

-- ---------------------------------------------------------------------
-- Funções
-- ---------------------------------------------------------------------

-- Último dia em que o cliente pode agendar (no fuso da barbearia).
create or replace function public.limite_agenda(p_barbearia uuid)
returns date language sql stable security definer set search_path = public as $$
  select least(
    (now() at time zone b.fuso)::date + b.dias_agenda_aberta,
    coalesce(b.agenda_aberta_ate, 'infinity'::date)
  )
  from public.barbearias b where b.id = p_barbearia;
$$;

-- Interna: grava o agendamento e os itens com o preço do dia.
create or replace function public._criar_agendamento(
  p_barbearia uuid, p_profissional uuid, p_cliente uuid, p_inicio timestamptz,
  p_servicos uuid[], p_origem text, p_observacoes text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_fuso text;
  v_dia date;
  v_dur int;
  v_qtd int;
  v_ag uuid;
begin
  select fuso into v_fuso from public.barbearias where id = p_barbearia;
  v_dia := (p_inicio at time zone v_fuso)::date;

  select coalesce(sum(duracao_min), 0), count(*) into v_dur, v_qtd
  from public.servicos
  where id = any (p_servicos) and barbearia_id = p_barbearia and ativo;

  if v_qtd = 0 or v_qtd <> (select count(distinct x) from unnest(p_servicos) x) then
    raise exception 'Escolha serviços válidos desta barbearia.';
  end if;

  if not exists (
    select 1 from public.profissionais
    where id = p_profissional and barbearia_id = p_barbearia and ativo
  ) then
    raise exception 'Profissional não encontrado.';
  end if;

  begin
    insert into public.agendamentos
      (barbearia_id, profissional_id, cliente_id, inicio, fim, origem, observacoes)
    values
      (p_barbearia, p_profissional, p_cliente, p_inicio,
       p_inicio + make_interval(mins => v_dur), p_origem, nullif(trim(p_observacoes), ''))
    returning id into v_ag;
  exception when exclusion_violation then
    raise exception 'Esse horário acabou de ser ocupado. Escolha outro.';
  end;

  insert into public.agendamento_itens
    (agendamento_id, barbearia_id, servico_id, nome, categoria,
     preco_tabela, preco_cobrado, promocao, promocao_nome)
  select v_ag, p_barbearia, s.id, s.nome, s.categoria,
         p.preco_tabela, p.preco, p.promocao_nome is not null, p.promocao_nome
  from public.servicos s
  cross join lateral public.preco_servico(s.id, v_dia) p
  where s.id = any (p_servicos) and s.barbearia_id = p_barbearia
  order by s.ordem, s.nome;

  return v_ag;
end $$;

-- Cria a barbearia com dados de exemplo (o barbeiro ajusta depois).
create or replace function public.criar_barbearia(p_nome text, p_slug text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_prof uuid;
  v_nome_prof text;
  d int;
begin
  if v_uid is null then raise exception 'Entre na sua conta primeiro.'; end if;

  begin
    insert into public.barbearias (nome, slug, dono_id)
    values (trim(p_nome), lower(trim(p_slug)), v_uid)
    returning id into v_id;
  exception
    when unique_violation then raise exception 'Esse endereço (link) já está em uso. Escolha outro.';
    when check_violation then raise exception 'Nome ou link inválido. No link use só letras minúsculas, números e hífen (3 a 40).';
  end;

  insert into public.membros (barbearia_id, user_id, papel) values (v_id, v_uid, 'dono');

  select nullif(trim(nome), '') into v_nome_prof from public.perfis where id = v_uid;
  insert into public.profissionais (barbearia_id, nome, user_id)
  values (v_id, coalesce(v_nome_prof, 'Barbeiro'), v_uid)
  returning id into v_prof;

  -- Terça a sábado, 9h–12h e 13h–19h
  for d in 2..6 loop
    insert into public.horarios_semana (barbearia_id, profissional_id, dia_semana, inicio, fim)
    values (v_id, v_prof, d, '09:00', '12:00'), (v_id, v_prof, d, '13:00', '19:00');
  end loop;

  insert into public.servicos (barbearia_id, nome, categoria, preco, duracao_min, ordem) values
    (v_id, 'Corte de cabelo', 'corte', 40, 30, 1),
    (v_id, 'Barba', 'barba', 30, 30, 2),
    (v_id, 'Sobrancelha', 'sobrancelha', 15, 15, 3),
    (v_id, 'Combo cabelo + barba', 'combo', 60, 60, 4);

  return v_id;
end $$;

-- Agendamento feito pelo cliente (site). Exige login.
create or replace function public.agendar(
  p_barbearia uuid, p_profissional uuid, p_inicio timestamptz, p_servicos uuid[],
  p_nome text default null, p_telefone text default null, p_observacoes text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  b public.barbearias%rowtype;
  v_dur int;
  v_fim timestamptz;
  v_local timestamp;
  v_local_fim timestamp;
  v_cliente uuid;
  v_perfil_nome text;
  v_perfil_tel text;
  v_tel text;
begin
  if v_uid is null then raise exception 'Entre na sua conta para agendar.'; end if;

  select * into b from public.barbearias where id = p_barbearia;
  if not found then raise exception 'Barbearia não encontrada.'; end if;
  if not public.barbearia_liberada(b.id) then
    raise exception 'O agendamento online desta barbearia está pausado. Fale com ela pelo WhatsApp.';
  end if;
  if p_servicos is null or cardinality(p_servicos) = 0 then
    raise exception 'Escolha pelo menos um serviço.';
  end if;

  select coalesce(sum(duracao_min), 0) into v_dur
  from public.servicos where id = any (p_servicos) and barbearia_id = b.id and ativo;
  v_fim := p_inicio + make_interval(mins => v_dur);
  v_local := p_inicio at time zone b.fuso;
  v_local_fim := v_fim at time zone b.fuso;

  if p_inicio < now() + make_interval(mins => b.antecedencia_minima_min) then
    raise exception 'Esse horário já passou ou está em cima da hora. Escolha outro.';
  end if;
  if v_local::date > public.limite_agenda(b.id) then
    raise exception 'A agenda desse dia ainda não foi aberta.';
  end if;

  if not (
    exists (
      select 1 from public.horarios_semana h
      where h.profissional_id = p_profissional
        and h.dia_semana = extract(dow from v_local)
        and v_local_fim::date = v_local::date
        and v_local::time >= h.inicio and v_local_fim::time <= h.fim
    )
    or exists (
      select 1 from public.horarios_extras e
      where e.profissional_id = p_profissional and p_inicio >= e.inicio and v_fim <= e.fim
    )
  ) then
    raise exception 'Esse horário está fora do expediente.';
  end if;

  if exists (
    select 1 from public.bloqueios bl
    where bl.barbearia_id = b.id
      and (bl.profissional_id is null or bl.profissional_id = p_profissional)
      and tstzrange(bl.inicio, bl.fim, '[)') && tstzrange(p_inicio, v_fim, '[)')
  ) then
    raise exception 'Esse horário não está disponível.';
  end if;

  select nullif(trim(nome), ''), telefone into v_perfil_nome, v_perfil_tel
  from public.perfis where id = v_uid;
  v_tel := nullif(regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g'), '');

  insert into public.clientes (barbearia_id, user_id, nome, telefone, email)
  values (
    b.id, v_uid,
    coalesce(nullif(trim(p_nome), ''), v_perfil_nome, 'Cliente'),
    coalesce(v_tel, v_perfil_tel),
    (select email from auth.users where id = v_uid)
  )
  on conflict (barbearia_id, user_id) do update
    set nome = excluded.nome,
        telefone = coalesce(excluded.telefone, public.clientes.telefone)
  returning id into v_cliente;

  -- Evita que uma pessoa ocupe a agenda toda
  if (select count(*) from public.agendamentos
      where cliente_id = v_cliente and status in ('agendado', 'confirmado') and inicio > now()) >= 3 then
    raise exception 'Você já tem 3 horários marcados nesta barbearia. Cancele um para marcar outro.';
  end if;

  return public._criar_agendamento(b.id, p_profissional, v_cliente, p_inicio, p_servicos, 'site', p_observacoes);
end $$;

-- Agendamento lançado pelo barbeiro no painel (pode ser fora do expediente).
create or replace function public.agendar_pelo_painel(
  p_barbearia uuid, p_profissional uuid, p_inicio timestamptz, p_servicos uuid[],
  p_cliente uuid default null, p_nome text default null, p_telefone text default null,
  p_observacoes text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_cliente uuid := p_cliente;
begin
  if not public.eh_membro(p_barbearia) then raise exception 'Sem acesso a esta barbearia.'; end if;
  if not public.barbearia_liberada(p_barbearia) then
    raise exception 'Assinatura pausada. Regularize para voltar a agendar.';
  end if;

  if v_cliente is null then
    if nullif(trim(p_nome), '') is null then raise exception 'Informe o nome do cliente.'; end if;
    insert into public.clientes (barbearia_id, nome, telefone)
    values (p_barbearia, trim(p_nome),
            nullif(regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g'), ''))
    returning id into v_cliente;
  elsif not exists (select 1 from public.clientes where id = v_cliente and barbearia_id = p_barbearia) then
    raise exception 'Cliente não encontrado.';
  end if;

  return public._criar_agendamento(p_barbearia, p_profissional, v_cliente, p_inicio, p_servicos, 'painel', p_observacoes);
end $$;

-- Horários ocupados (agendamentos e bloqueios), sem expor nomes. Público.
create or replace function public.horarios_ocupados(p_barbearia uuid, p_de timestamptz, p_ate timestamptz)
returns table (profissional_id uuid, inicio timestamptz, fim timestamptz)
language sql stable security definer set search_path = public as $$
  select a.profissional_id, a.inicio, a.fim from public.agendamentos a
  where a.barbearia_id = p_barbearia
    and a.status in ('agendado', 'confirmado', 'concluido')
    and a.inicio < p_ate and a.fim > p_de
  union all
  select bl.profissional_id, bl.inicio, bl.fim from public.bloqueios bl
  where bl.barbearia_id = p_barbearia and bl.inicio < p_ate and bl.fim > p_de;
$$;

create or replace function public.cancelar_agendamento_cliente(p_agendamento uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.agendamentos a
     set status = 'cancelado', cancelado_por = 'cliente', respondido_em = now()
   where a.id = p_agendamento
     and a.status in ('agendado', 'confirmado')
     and a.inicio > now()
     and a.cliente_id in (select c.id from public.clientes c where c.user_id = auth.uid());
  if not found then raise exception 'Não foi possível cancelar este horário.'; end if;
end $$;

-- Página de confirmação (link que vai no WhatsApp). Não exige login: o token é a chave.
create or replace function public.confirmacao_ver(p_token uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'status', a.status,
    'inicio', a.inicio,
    'fim', a.fim,
    'cliente', split_part(c.nome, ' ', 1),
    'profissional', p.nome,
    'servicos', (select coalesce(jsonb_agg(i.nome order by i.nome), '[]'::jsonb)
                 from public.agendamento_itens i where i.agendamento_id = a.id),
    'barbearia', jsonb_build_object(
      'nome', b.nome, 'slug', b.slug, 'endereco', b.endereco, 'cidade', b.cidade,
      'maps_url', b.maps_url, 'whatsapp', b.whatsapp, 'fuso', b.fuso)
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
begin
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

-- Fechamento de caixa / relatório por período (datas no fuso da barbearia).
create or replace function public.relatorio_caixa(p_barbearia uuid, p_de date, p_ate date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_fuso text;
  r jsonb;
begin
  if not public.eh_membro(p_barbearia) then raise exception 'Sem acesso a esta barbearia.'; end if;
  select fuso into v_fuso from public.barbearias where id = p_barbearia;

  with ag as (
    select a.* from public.agendamentos a
    where a.barbearia_id = p_barbearia
      and (a.inicio at time zone v_fuso)::date between p_de and p_ate
  ),
  it as (
    select i.*, ag.forma_pagamento, ag.profissional_id, (ag.inicio at time zone v_fuso)::date as dia
    from public.agendamento_itens i join ag on ag.id = i.agendamento_id
    where ag.status = 'concluido'
  )
  select jsonb_build_object(
    'de', p_de, 'ate', p_ate,
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
        select p.nome, count(distinct it.agendamento_id) as qtd, sum(it.preco_cobrado) as valor
        from it join public.profissionais p on p.id = it.profissional_id group by p.nome) x),
    'por_dia', (select coalesce(jsonb_agg(x order by x.dia), '[]'::jsonb) from (
        select dia, count(distinct agendamento_id) as qtd, sum(preco_cobrado) as valor
        from it group by dia) x)
  ) into r;
  return r;
end $$;

-- Quem pode chamar o quê
revoke execute on function public._criar_agendamento(uuid, uuid, uuid, timestamptz, uuid[], text, text) from public, anon, authenticated;
revoke execute on function public.criar_barbearia(text, text) from public, anon;
revoke execute on function public.agendar(uuid, uuid, timestamptz, uuid[], text, text, text) from public, anon;
revoke execute on function public.agendar_pelo_painel(uuid, uuid, timestamptz, uuid[], uuid, text, text, text) from public, anon;
revoke execute on function public.cancelar_agendamento_cliente(uuid) from public, anon;
revoke execute on function public.relatorio_caixa(uuid, date, date) from public, anon;
grant execute on function public.criar_barbearia(text, text) to authenticated;
grant execute on function public.agendar(uuid, uuid, timestamptz, uuid[], text, text, text) to authenticated;
grant execute on function public.agendar_pelo_painel(uuid, uuid, timestamptz, uuid[], uuid, text, text, text) to authenticated;
grant execute on function public.cancelar_agendamento_cliente(uuid) to authenticated;
grant execute on function public.relatorio_caixa(uuid, date, date) to authenticated;
grant execute on function public.horarios_ocupados(uuid, timestamptz, timestamptz) to anon, authenticated;
grant execute on function public.confirmacao_ver(uuid) to anon, authenticated;
grant execute on function public.confirmacao_responder(uuid, boolean) to anon, authenticated;
grant execute on function public.limite_agenda(uuid) to anon, authenticated;
grant execute on function public.preco_servico(uuid, date) to anon, authenticated;
