-- =====================================================================
-- 007_assinatura_asaas.sql — teste grátis de 7 dias + cobrança pelo Asaas
--
-- O que faz:
--   * barbearias que JÁ EXISTEM viram "cortesia": grátis para sempre
--     (plano = 'cortesia', continuam em "teste" sem vencimento)
--   * barbearia NOVA nasce com 7 dias de teste (vence em hoje + 7);
--     depois disso (+ 3 dias de tolerância) fica bloqueada até pagar
--   * tabela assinaturas: liga a barbearia ao cliente/assinatura do Asaas
--     (o dono só lê; quem grava é o servidor, com a chave de serviço)
--   * tabela asaas_eventos: cada aviso do Asaas é guardado uma vez só
--     (o Asaas pode mandar o mesmo aviso mais de uma vez)
--
-- NADA é apagado por falta de pagamento: barbearia vencida/suspensa só
-- fica bloqueada (não agenda, não edita). Pagou, volta como estava.
--
-- Idempotente: pode rodar de novo.
--
-- Como reverter:
--   drop trigger if exists barbearias_teste_gratis on public.barbearias;
--   drop function if exists public.teste_gratis_7_dias();
--   drop table if exists public.asaas_eventos, public.assinaturas;
--   update public.barbearias set assinatura_valida_ate = null
--     where plano = 'teste' and assinatura_status = 'teste';
--   update public.barbearias set plano = 'teste' where plano = 'cortesia';
-- =====================================================================

-- ---------------------------------------------------------------------
-- Barbearias que já existem: cortesia (grátis para sempre)
-- Só pega quem está em teste SEM vencimento, ou seja, as antigas.
-- (as novas, criadas depois desta migração, já nascem com vencimento)
-- ---------------------------------------------------------------------
update public.barbearias
set plano = 'cortesia'
where plano = 'teste' and assinatura_status = 'teste' and assinatura_valida_ate is null;

-- ---------------------------------------------------------------------
-- Barbearia nova: 7 dias de teste grátis
-- ---------------------------------------------------------------------
create or replace function public.teste_gratis_7_dias()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.plano = 'teste' and new.assinatura_status = 'teste' and new.assinatura_valida_ate is null then
    new.assinatura_valida_ate := current_date + 7;
  end if;
  return new;
end $$;

drop trigger if exists barbearias_teste_gratis on public.barbearias;
create trigger barbearias_teste_gratis
  before insert on public.barbearias
  for each row execute function public.teste_gratis_7_dias();

-- ---------------------------------------------------------------------
-- Assinatura no Asaas (uma por barbearia)
-- ---------------------------------------------------------------------
create table if not exists public.assinaturas (
  barbearia_id uuid primary key references public.barbearias(id) on delete restrict,
  asaas_cliente text not null,
  asaas_assinatura text unique,
  forma text not null check (forma in ('PIX', 'BOLETO', 'CREDIT_CARD')),
  valor numeric(10, 2) not null,
  situacao text not null default 'ativa' check (situacao in ('ativa', 'cancelada')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.assinaturas enable row level security;
drop policy if exists assinaturas_ver on public.assinaturas;
create policy assinaturas_ver on public.assinaturas for select using (public.eh_dono(barbearia_id));
revoke insert, update, delete on public.assinaturas from anon, authenticated;

-- ---------------------------------------------------------------------
-- Avisos recebidos do Asaas (para não processar o mesmo duas vezes)
-- Ninguém do site lê nem grava: só o servidor (chave de serviço).
-- ---------------------------------------------------------------------
create table if not exists public.asaas_eventos (
  id text primary key,
  tipo text not null,
  cobranca text,
  assinatura text,
  dados jsonb not null,
  recebido_em timestamptz not null default now()
);

alter table public.asaas_eventos enable row level security;
revoke all on public.asaas_eventos from anon, authenticated;
