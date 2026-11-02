# Agenda de Barbearia

Sistema de agendamento para várias barbearias (cada uma com seu link
`/b/<nome>`), com confirmação pelo WhatsApp, agenda do barbeiro, preços
e promoções e fechamento de caixa.

**Stack:** Next.js 16 (App Router) + TypeScript + Tailwind 4, Supabase
(Postgres, RLS, RPCs), hospedagem na Vercel. O visual atual é provisório.

## Como ligar (primeira vez)

1. Crie um projeto **novo** no [Supabase](https://supabase.com) (não use o
   banco de outro sistema).
2. No Supabase, abra **SQL Editor**, cole o conteúdo de
   `supabase/migrations/001_inicial.sql` e rode.
3. Em **Authentication → Sign In / Providers → Email**: para testar mais
   rápido, desligue **Confirm email**. Em produção, deixe ligado e configure
   em **URL Configuration** o endereço do site.
4. Copie `.env.example` para `.env.local` e preencha com **Project Settings
   → API** (URL e chave pública/anon). A chave secreta **não** é usada.
5. `npm install` e `npm run dev`. Abra `http://localhost:3000`.

## Fluxo

- **Barbeiro:** cria conta → cria a barbearia (já vem com serviços e horários
  de exemplo) → ajusta em Serviços, Horários e Configurações → divulga o link.
- **Cliente:** abre o link → escolhe serviços, dia e hora → entra ou cria conta
  (nome, WhatsApp, e-mail, senha; fica conectado no aparelho) → recebe a
  página do horário (`/c/<código>`) com **Vou / Não vou** e rota no Google Maps.
- **Confirmação:** a tela **Hoje** do painel lista os lembretes. Um toque abre
  o WhatsApp com a mensagem pronta. “Não vou” libera o horário na hora; sem
  resposta fica **amarelo**, “Vou” fica **verde**.
- **Caixa:** em cada horário, “Fechar atendimento” registra o valor cobrado
  (dá para dar desconto), serviços extras e a forma de pagamento. Em
  **Relatórios**: hoje, semana, 7 dias, mês, ano ou qualquer período.

## WhatsApp

**Agora (grátis):** resposta automática do **WhatsApp Business** com o link
(textos prontos em Configurações) + lembretes com um toque (`wa.me`).

**Depois (pago, opcional):** API oficial da Meta (Cloud API). Daria para:
mandar o lembrete sozinho, botões “Vou / Não vou” dentro do WhatsApp e
agendar sem sair do WhatsApp (WhatsApp Flows). As mensagens que a
barbearia inicia são cobradas pela Meta. Os pontos de troca estão em
`src/lib/whatsapp.ts`.

## Assinatura (cobrança mensal)

Cada barbearia tem `assinatura_status` (`teste`, `ativa`, `atrasada`,
`suspensa`, `cancelada`) e `assinatura_valida_ate`. Fora do prazo (com 3
dias de tolerância), o cliente não agenda e o painel fica só para leitura.
O barbeiro **não** consegue mudar esses campos. Por enquanto, pelo SQL Editor:

```sql
-- suspender
update barbearias set assinatura_status = 'suspensa' where slug = 'nome-da-barbearia';
-- ativar até uma data
update barbearias set assinatura_status = 'ativa', assinatura_valida_ate = '2026-12-31' where slug = 'nome-da-barbearia';
```

## Testes

- `npm test`: horários livres, fuso, promoções e telefones.
- `npm run test:banco`: roda a migração num Postgres local (PGlite) e testa
  agendamento, choque de horários, promoções, permissões entre clientes,
  confirmação por link, relatório e bloqueio por assinatura. Não toca no
  Supabase real.
