-- =====================================================================
-- 006_avisos_telefone_unico.sql — avisos do painel + WhatsApp sem repetir
--
-- O que faz:
--   * tabela notificacoes: o banco grava sozinho um aviso quando um
--     horário é marcado, desmarcado, confirmado ou remarcado
--     (o dono vê todos da barbearia; o barbeiro, só os dele)
--   * notificacoes entra no Realtime (o sino do painel recebe na hora)
--   * avisos com mais de 60 dias são apagados aos poucos
--   * WhatsApp único: duas contas não podem ter o mesmo número
--     (compara só os dígitos e ignora o 55 do Brasil na frente)
--   * telefone_em_uso(texto): o cadastro confere antes de criar a conta
--   * as contas que já existem não são mexidas (mesmo se repetidas)
--
-- Idempotente: pode rodar de novo.
--
-- Como reverter:
--   drop trigger if exists agendamentos_avisar on public.agendamentos;
--   drop trigger if exists perfis_telefone_unico on public.perfis;
--   drop function if exists public.avisar_agendamento(), public.telefone_unico(),
--     public.telefone_em_uso(text), public.telefone_normalizado(text);
--   drop table if exists public.notificacoes;
--   (a tabela sai do Realtime junto com o drop)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Avisos
-- ---------------------------------------------------------------------
create table if not exists public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references public.barbearias(id) on delete cascade,
  profissional_id uuid references public.profissionais(id) on delete cascade,
  agendamento_id uuid references public.agendamentos(id) on delete cascade,
  tipo text not null check (tipo in ('marcou', 'desmarcou', 'confirmou', 'remarcou')),
  cliente_nome text not null default '',
  profissional_nome text not null default '',
  inicio timestamptz,
  -- quem fez a mudança (null = cliente pelo link, sem login); o painel não avisa a própria pessoa
  autor uuid default auth.uid(),
  criado_em timestamptz not null default now()
);
create index if not exists notificacoes_barbearia_criado on public.notificacoes (barbearia_id, criado_em desc);

alter table public.notificacoes enable row level security;
drop policy if exists notificacoes_ver on public.notificacoes;
create policy notificacoes_ver on public.notificacoes for select
  using (public.eh_dono(barbearia_id) or (profissional_id is not null and public.pode_profissional(profissional_id)));
-- ninguém grava direto: só o gatilho abaixo
revoke insert, update, delete on public.notificacoes from anon, authenticated;
grant select on public.notificacoes to authenticated;

create or replace function public.avisar_agendamento()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_tipo text;
begin
  if tg_op = 'INSERT' then
    if new.status in ('agendado', 'confirmado') then v_tipo := 'marcou'; end if;
  elsif new.status is distinct from old.status then
    if new.status = 'cancelado' then v_tipo := 'desmarcou';
    elsif new.status = 'confirmado' and old.status = 'agendado' then v_tipo := 'confirmou';
    end if;
  elsif new.status in ('agendado', 'confirmado')
    and (new.inicio is distinct from old.inicio or new.profissional_id is distinct from old.profissional_id) then
    v_tipo := 'remarcou';
  end if;
  if v_tipo is null then return new; end if;

  insert into public.notificacoes (barbearia_id, profissional_id, agendamento_id, tipo, cliente_nome, profissional_nome, inicio)
  values (
    new.barbearia_id, new.profissional_id, new.id, v_tipo,
    coalesce((select nome from public.clientes where id = new.cliente_id), ''),
    coalesce((select nome from public.profissionais where id = new.profissional_id), ''),
    new.inicio
  );

  -- faxina: de vez em quando apaga avisos antigos desta barbearia
  if random() < 0.05 then
    delete from public.notificacoes where barbearia_id = new.barbearia_id and criado_em < now() - interval '60 days';
  end if;
  return new;
end $$;
drop trigger if exists agendamentos_avisar on public.agendamentos;
create trigger agendamentos_avisar after insert or update on public.agendamentos
  for each row execute function public.avisar_agendamento();

-- Realtime (só existe no Supabase; no teste local a publicação não existe)
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notificacoes') then
    alter publication supabase_realtime add table public.notificacoes;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- WhatsApp único
-- ---------------------------------------------------------------------
create or replace function public.telefone_normalizado(p text)
returns text language sql immutable as $$
  select case
    when d ~ '^55\d{10,11}$' then substr(d, 3)
    else nullif(d, '')
  end
  from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') d) x;
$$;

create index if not exists perfis_telefone_norm on public.perfis (public.telefone_normalizado(telefone));

-- Usada pelo formulário de cadastro (antes de criar a conta)
create or replace function public.telefone_em_uso(p_telefone text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.telefone_normalizado(p_telefone) is not null and exists (
    select 1 from public.perfis
    where public.telefone_normalizado(telefone) = public.telefone_normalizado(p_telefone)
  );
$$;
grant execute on function public.telefone_em_uso(text) to anon, authenticated;

-- Garantia no banco (vale também se alguém pular o formulário)
create or replace function public.telefone_unico()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.telefone_normalizado(new.telefone) is null then return new; end if;
  if tg_op = 'UPDATE' and public.telefone_normalizado(new.telefone) is not distinct from public.telefone_normalizado(old.telefone) then
    return new;
  end if;
  if exists (
    select 1 from public.perfis
    where id <> new.id and public.telefone_normalizado(telefone) = public.telefone_normalizado(new.telefone)
  ) then
    raise exception 'Esse WhatsApp já tem uma conta. Use a opção Entrar.';
  end if;
  return new;
end $$;
drop trigger if exists perfis_telefone_unico on public.perfis;
create trigger perfis_telefone_unico before insert or update of telefone on public.perfis
  for each row execute function public.telefone_unico();
