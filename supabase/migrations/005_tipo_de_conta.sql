-- =====================================================================
-- 005_tipo_de_conta.sql — conta de CLIENTE ou de PROFISSIONAL (barbeiro/dono)
--
-- O que faz:
--   * perfis.tipo: 'cliente' ou 'profissional', escolhido no cadastro
--     (fica gravado e não muda depois)
--   * contas que já são de alguma equipe viram 'profissional'
--   * conta de profissional NÃO agenda como cliente pelo site
--     (pelo painel continua marcando horário para os clientes)
--   * conta de cliente NÃO cria barbearia nem aceita convite de equipe
--   * os agendamentos e equipes que já existem não são mexidos
--
-- Idempotente: pode rodar de novo.
--
-- Como reverter:
--   drop trigger if exists perfis_tipo_fixo on public.perfis;
--   drop trigger if exists membros_so_profissional on public.membros;
--   drop trigger if exists agendamentos_so_cliente on public.agendamentos;
--   drop function if exists public.tipo_fixo(), public.membro_so_profissional(),
--     public.agendar_so_cliente(), public.tipo_da_conta(uuid);
--   alter table public.perfis drop column if exists tipo;
--   -- e rode de novo a função criar_perfil da 001
-- =====================================================================

alter table public.perfis add column if not exists tipo text not null default 'cliente';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'perfis_tipo_valido') then
    alter table public.perfis add constraint perfis_tipo_valido check (tipo in ('cliente', 'profissional'));
  end if;
end $$;

-- quem já está em alguma equipe é profissional
update public.perfis set tipo = 'profissional'
where tipo <> 'profissional' and id in (select user_id from public.membros);

-- cadastro: o tipo vem do formulário ("profissional" ou "cliente")
create or replace function public.criar_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, nome, telefone, tipo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', ''),
    nullif(regexp_replace(coalesce(new.raw_user_meta_data->>'telefone', ''), '\D', '', 'g'), ''),
    case when new.raw_user_meta_data->>'tipo' = 'profissional' then 'profissional' else 'cliente' end
  )
  on conflict (id) do nothing;
  return new;
end $$;

create or replace function public.tipo_da_conta(p_user uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select tipo from public.perfis where id = p_user), 'cliente');
$$;

-- o tipo não muda depois do cadastro (só pelo SQL Editor, como administrador)
create or replace function public.tipo_fixo()
returns trigger language plpgsql as $$
begin
  if new.tipo is distinct from old.tipo and auth.uid() is not null then
    raise exception 'O tipo da conta não pode ser trocado.';
  end if;
  return new;
end $$;
drop trigger if exists perfis_tipo_fixo on public.perfis;
create trigger perfis_tipo_fixo before update on public.perfis
  for each row execute function public.tipo_fixo();

-- equipe (criar barbearia / aceitar convite): só conta de profissional
create or replace function public.membro_so_profissional()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.tipo_da_conta(new.user_id) <> 'profissional' then
    raise exception 'Esta é uma conta de cliente. Para trabalhar no painel, crie uma conta de barbeiro com outro e-mail.';
  end if;
  return new;
end $$;
drop trigger if exists membros_so_profissional on public.membros;
create trigger membros_so_profissional before insert on public.membros
  for each row execute function public.membro_so_profissional();

-- agendamento pelo site: só conta de cliente
create or replace function public.agendar_so_cliente()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.origem = 'site' and auth.uid() is not null and public.tipo_da_conta(auth.uid()) = 'profissional' then
    raise exception 'Esta é uma conta de barbeiro. Para marcar horário como cliente, saia e use uma conta de cliente.';
  end if;
  return new;
end $$;
drop trigger if exists agendamentos_so_cliente on public.agendamentos;
create trigger agendamentos_so_cliente before insert on public.agendamentos
  for each row execute function public.agendar_so_cliente();

revoke execute on function public.tipo_da_conta(uuid) from public, anon, authenticated;
