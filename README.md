# Seu Barbeiro

**Seu Barbeiro** é a marca do site (aparece para todos). Cada dono cadastra a
sua barbearia, que aparece com o próprio nome ("Barbearia X por Seu Barbeiro").
Logo vetorial: `src/components/Logo.tsx` (versão estática em
`public/logo-seu-barbeiro.svg` e o ícone da aba em `src/app/icon.svg`).

Sistema de agendamento para várias barbearias (cada uma com seu link
`/b/<nome>`), com aviso na hora para o barbeiro, agenda, preços
e promoções e fechamento de caixa.

**Stack:** Next.js 16 (App Router) + TypeScript + Tailwind 4, Supabase
(Postgres, RLS, RPCs), hospedagem na Vercel. Animações de rolagem em CSS puro (respeitam “reduzir movimento”; navegador sem
suporte mostra tudo sem animação).

## Como ligar (primeira vez)

1. Crie um projeto **novo** no [Supabase](https://supabase.com) (não use o
   banco de outro sistema).
2. No Supabase, abra **SQL Editor**, cole o conteúdo de
   `supabase/migrations/001_inicial.sql` e rode. Depois faça o mesmo com
   `002_equipe_fotos.sql` (equipe, convites, fotos e relatórios por profissional).
   Depois, na ordem, `003` (serviços de cada profissional), `004` (galeria e
   Sobre nós), `005` (conta de cliente x conta de barbeiro) e `006` (avisos do
   painel e WhatsApp sem repetir). As partes de “lembrete” da 003 ficaram no
   banco, mas o site não usa mais.
3. Em **Authentication → Sign In / Providers → Email**: para testar mais
   rápido, desligue **Confirm email**. Em produção, deixe ligado e configure
   em **URL Configuration** o endereço do site.
4. Copie `.env.example` para `.env.local` e preencha com **Project Settings
   → API** (URL e chave pública/anon). A chave secreta **não** é usada.
5. `npm install` e `npm run dev`. Abra `http://localhost:3000`.

## Fluxo

- **Dono:** cria conta → cria a barbearia (já vem com serviços e horários
  de exemplo, e ele mesmo como profissional) → ajusta Serviços, Horários e
  Barbearia (capa) → em **Equipe**, gera um link de convite para cada barbeiro.
- **Barbeiro da equipe:** abre o convite → cria conta → escolhe nome e
  “Barbeiro/Barbeira” → põe foto em **Meu perfil**. Só mexe na própria agenda,
  nos próprios clientes e vê só o próprio relatório. O dono vê e emite tudo.
- Barbearia de um profissional só: o dono é o único profissional.
- **Cliente:** abre o link → escolhe o profissional (foto, nome e título) → serviços, dia e hora → entra ou cria conta
  (nome, WhatsApp, e-mail, senha; fica conectado no aparelho) → recebe a
  página do horário (`/c/<código>`) com rota no Google Maps e o botão
  **Desmarcar** (libera o horário na hora).
- **Avisos:** o sino do painel avisa na hora, com som, quando um cliente marca
  ou desmarca. Não há mais confirmação “Vou / Não vou”; o barbeiro ainda pode
  usar “Marcar confirmado” se quiser.
- **Caixa:** em cada horário, “Fechar atendimento” registra o valor cobrado
  (dá para dar desconto), serviços extras e a forma de pagamento. Em
  **Relatórios**: hoje, semana, 7 dias, mês, ano ou qualquer período; o dono
  escolhe “Todos” ou um profissional.

## WhatsApp

**Agora (grátis):** resposta automática do **WhatsApp Business** com o link
(textos prontos em Configurações) + “Avisar que marcou” com um toque (`wa.me`).

**Depois (pago, opcional):** API oficial da Meta (Cloud API). Daria para:
mandar mensagens sozinho e agendar sem sair do WhatsApp (WhatsApp Flows). As mensagens que a
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
