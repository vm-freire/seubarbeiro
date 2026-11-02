-- =====================================================================
-- 004_galeria_sobre.sql — galeria de trabalhos (fotos de cortes) e
-- texto "Sobre nós" da barbearia
--
-- O que faz:
--   * barbearias.sobre: texto "Sobre nós" (até 2000 letras), só o dono edita
--   * trabalhos: fotos de cortes e trabalhos que aparecem no carrossel e na
--     galeria da página da barbearia
--       - o dono envia, edita e apaga qualquer foto
--       - o barbeiro envia fotos com o nome dele e apaga só as dele
--       - até 120 fotos por barbearia
--   * as fotos ficam no bucket "fotos" que já existe (migração 002), em
--     <barbearia>/<profissional>/trabalhos/... ou <barbearia>/galeria/...
--     (as regras de envio da 002 já cobrem esses caminhos)
--
-- Idempotente: pode rodar de novo.
--
-- Como reverter (apaga a galeria; os arquivos ficam no Storage):
--   drop table if exists public.trabalhos;
--   drop function if exists public.limitar_trabalhos();
--   alter table public.barbearias drop column if exists sobre;
-- =====================================================================

alter table public.barbearias add column if not exists sobre text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'barbearias_sobre_tamanho') then
    alter table public.barbearias add constraint barbearias_sobre_tamanho check (length(sobre) <= 2000);
  end if;
end $$;
grant update (sobre) on public.barbearias to authenticated;

create table if not exists public.trabalhos (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references public.barbearias(id) on delete cascade,
  profissional_id uuid references public.profissionais(id) on delete set null,
  url text not null check (url ~ '^https://'),
  caminho text not null,
  legenda text check (length(legenda) <= 120),
  criado_por uuid default auth.uid(),
  criado_em timestamptz not null default now()
);
create index if not exists trabalhos_barbearia on public.trabalhos (barbearia_id, criado_em desc);

alter table public.trabalhos enable row level security;

drop policy if exists trabalhos_ver on public.trabalhos;
create policy trabalhos_ver on public.trabalhos for select using (true);

-- envia: o dono (com ou sem profissional) ou o barbeiro com o próprio nome
drop policy if exists trabalhos_enviar on public.trabalhos;
create policy trabalhos_enviar on public.trabalhos for insert
  with check (
    public.barbearia_liberada(barbearia_id)
    and (
      public.eh_dono(barbearia_id)
      or (profissional_id is not null and public.pode_profissional(profissional_id))
    )
    and (profissional_id is null or exists (
      select 1 from public.profissionais p where p.id = profissional_id and p.barbearia_id = trabalhos.barbearia_id))
  );

drop policy if exists trabalhos_editar on public.trabalhos;
create policy trabalhos_editar on public.trabalhos for update
  using (public.eh_dono(barbearia_id) or (profissional_id is not null and public.pode_profissional(profissional_id)))
  with check (public.eh_dono(barbearia_id) or (profissional_id is not null and public.pode_profissional(profissional_id)));

drop policy if exists trabalhos_apagar on public.trabalhos;
create policy trabalhos_apagar on public.trabalhos for delete
  using (public.eh_dono(barbearia_id) or (profissional_id is not null and public.pode_profissional(profissional_id)));

grant select on public.trabalhos to anon, authenticated;
grant insert, update, delete on public.trabalhos to authenticated;

-- limite de 120 fotos; depois de enviada, só muda a legenda (e o profissional, pelo dono)
create or replace function public.limitar_trabalhos()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    if new.barbearia_id <> old.barbearia_id or new.url <> old.url or new.caminho <> old.caminho then
      raise exception 'Só a legenda e o profissional podem ser alterados.';
    end if;
    if new.profissional_id is distinct from old.profissional_id and not public.eh_dono(new.barbearia_id) then
      raise exception 'Só o dono muda o profissional da foto.';
    end if;
    return new;
  end if;
  if (select count(*) from public.trabalhos where barbearia_id = new.barbearia_id) >= 120 then
    raise exception 'A galeria chegou ao limite de 120 fotos. Apague algumas antigas para enviar novas.';
  end if;
  return new;
end $$;

drop trigger if exists trabalhos_limite on public.trabalhos;
create trigger trabalhos_limite before insert or update on public.trabalhos
  for each row execute function public.limitar_trabalhos();
