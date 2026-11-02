/**
 * Testa as migrações num Postgres de verdade rodando dentro do Node
 * (PGlite), com uma imitação mínima do Supabase (auth.users, auth.uid(),
 * papéis anon/authenticated). Não toca no Supabase real.
 *   npm run test:banco
 */
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { readFileSync, readdirSync } from "node:fs";

const pasta = new URL("../supabase/migrations/", import.meta.url);
const migracao = readdirSync(pasta).filter((f) => f.endsWith(".sql")).sort()
  .map((f) => readFileSync(new URL(f, pasta), "utf8")).join(";\n");
const db = new PGlite({ extensions: { btree_gist } });

// Imitação mínima do Supabase
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  create schema auth;
  grant usage on schema auth to anon, authenticated;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('teste.uid', true), '')::uuid $$;
`);

await db.exec(migracao);
await db.exec(migracao); // idempotência
console.log("migração rodou 2x ok");

let falhas = 0;
const ok = (cond, msg) => { console.log((cond ? "  OK  " : "  FALHOU ") + msg); if (!cond) falhas++; };

async function como(uid, sql, params = []) {
  await db.exec(`reset role; select set_config('teste.uid', '${uid ?? ""}', false);`);
  await db.exec(uid ? "set role authenticated" : "set role anon");
  try { return await db.query(sql, params); } finally { await db.exec("reset role"); }
}
async function erro(uid, sql, params = []) {
  try { await como(uid, sql, params); return null; } catch (e) { return e.message; }
}

const usuario = async (email, nome) =>
  (await db.query(`insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
    [email, { nome, telefone: "(41) 99999-0000" }])).rows[0].id;

const A = await usuario("barbeiro@example.com", "João Barbeiro");
const B = await usuario("cliente1@example.com", "Pedro");
const C = await usuario("cliente2@example.com", "Lucas");

ok((await db.query(`select nome, telefone from perfis where id=$1`, [A])).rows[0].telefone === "41999990000", "perfil criado com telefone só dígitos");

const barb = (await como(A, `select criar_barbearia('Barbearia do João', 'barbearia-do-joao') id`)).rows[0].id;
ok(!!barb, "criar_barbearia");
ok((await erro(B, `select criar_barbearia('Outra', 'barbearia-do-joao')`))?.includes("já está em uso"), "slug repetido dá mensagem amigável");

const prof = (await db.query(`select id, nome from profissionais where barbearia_id=$1`, [barb])).rows[0];
ok(prof.nome === "João Barbeiro", "profissional criado com nome do dono");
const sv = Object.fromEntries((await db.query(`select nome, id from servicos where barbearia_id=$1`, [barb])).rows.map(r => [r.nome, r.id]));

// terça da semana que vem, no fuso de SP
const ter = (await db.query(`select (date_trunc('week', now() at time zone 'America/Sao_Paulo')::date + 8)::text d`)).rows[0].d;
const seg = (await db.query(`select ($1::date - 1)::text d`, [ter])).rows[0].d;
const ts = (d, h) => `${d} ${h}-03`;

const agendar = (uid, inicio, servicos) =>
  como(uid, `select agendar($1, $2, $3::timestamptz, $4::uuid[]) id`, [barb, prof.id, inicio, servicos]);

const ag1 = (await agendar(B, ts(ter, "10:00"), [sv["Corte de cabelo"]])).rows[0].id;
ok(!!ag1, "cliente agenda corte terça 10h");
ok((await erro(C, `select agendar($1,$2,$3::timestamptz,$4::uuid[])`, [barb, prof.id, ts(ter, "10:00"), [sv["Barba"]]]))?.includes("acabou de ser ocupado"), "mesmo horário bloqueado");
ok((await erro(C, `select agendar($1,$2,$3::timestamptz,$4::uuid[])`, [barb, prof.id, ts(ter, "10:15"), [sv["Barba"]]]))?.includes("acabou de ser ocupado"), "horário sobreposto bloqueado");
ok(!!(await agendar(C, ts(ter, "10:30"), [sv["Barba"]])).rows[0].id, "horário colado (10:30) liberado");
ok((await erro(C, `select agendar($1,$2,$3::timestamptz,$4::uuid[])`, [barb, prof.id, ts(seg, "10:00"), [sv["Barba"]]]))?.includes("fora do expediente"), "segunda (folga) recusada");
ok((await erro(C, `select agendar($1,$2,$3::timestamptz,$4::uuid[])`, [barb, prof.id, ts(ter, "11:30"), [sv["Combo cabelo + barba"]]]))?.includes("fora do expediente"), "combo 60min às 11:30 passa do almoço: recusado");
ok((await erro(null, `select agendar($1,$2,$3::timestamptz,$4::uuid[])`, [barb, prof.id, ts(ter, "15:00"), [sv["Barba"]]])) !== null, "anônimo não agenda");

// promoção de terça
await como(A, `insert into promocoes (barbearia_id, servico_id, nome, preco, dias_semana) values ($1, $2, 'Terça do corte', 30, '{2}')`, [barb, sv["Corte de cabelo"]]);
const ag3 = (await agendar(C, ts(ter, "11:30"), [sv["Corte de cabelo"]])).rows[0].id;
const it3 = (await db.query(`select preco_tabela, preco_cobrado, promocao, promocao_nome from agendamento_itens where agendamento_id=$1`, [ag3])).rows[0];
ok(Number(it3.preco_cobrado) === 30 && it3.promocao && it3.promocao_nome === "Terça do corte", "promoção aplicada no preço");

// visibilidade
ok((await como(B, `select id from agendamentos`)).rows.length === 1, "cliente B vê só o seu agendamento");
ok((await como(C, `select id from agendamentos`)).rows.length === 2, "cliente C vê só os dele");
ok((await como(A, `select id from agendamentos`)).rows.length === 3, "barbeiro vê todos");
ok((await como(null, `select id from agendamentos`)).rows.length === 0, "anônimo não vê agendamentos");
ok((await como(null, `select * from horarios_ocupados($1, now(), now() + interval '30 days')`, [barb])).rows.length === 3, "anônimo vê só os horários ocupados");
ok((await como(B, `select id from clientes`)).rows.length === 1, "cliente vê só o próprio cadastro");

// confirmação por link
const tok = (await db.query(`select token_confirmacao t from agendamentos where id=$1`, [ag1])).rows[0].t;
const info = (await como(null, `select confirmacao_ver($1) j`, [tok])).rows[0].j;
ok(info.cliente === "Pedro" && info.servicos[0] === "Corte de cabelo", "página de confirmação mostra dados");
ok((await como(null, `select confirmacao_responder($1, true) s`, [tok])).rows[0].s === "confirmado", "Vou → confirmado");
ok((await como(null, `select confirmacao_responder($1, false) s`, [tok])).rows[0].s === "cancelado", "Não vou → cancelado");
ok((await erro(null, `select confirmacao_responder($1, true)`, [tok]))?.includes("não pode mais"), "cancelado não volta pelo link");
ok(!!(await agendar(C, ts(ter, "10:00"), [sv["Sobrancelha"]])).rows[0].id, "horário liberado pode ser marcado de novo");
ok((await erro(C, `select agendar($1,$2,$3::timestamptz,$4::uuid[])`, [barb, prof.id, ts(ter, "15:00"), [sv["Barba"]]]))?.includes("3 horários"), "limite de 3 horários por cliente");

// painel: agendamento manual e fechamento
const ag4 = (await como(A, `select agendar_pelo_painel($1,$2,$3::timestamptz,$4::uuid[],null,'Zé da Silva','41 98888-7777') id`,
  [barb, prof.id, ts(ter, "20:00"), [sv["Combo cabelo + barba"]]])).rows[0].id;
ok(!!ag4, "barbeiro agenda fora do expediente pelo painel");
ok((await erro(B, `select agendar_pelo_painel($1,$2,$3::timestamptz,$4::uuid[],null,'X','1')`, [barb, prof.id, ts(ter, "21:00"), [sv["Barba"]]]))?.includes("Sem acesso"), "cliente não usa a função do painel");
await como(A, `update agendamento_itens set preco_cobrado = 50 where agendamento_id = $1`, [ag4]);
await como(A, `update agendamentos set status='concluido', forma_pagamento='pix' where id = $1`, [ag4]);
await como(A, `update agendamentos set status='concluido', forma_pagamento='dinheiro' where id = $1`, [ag3]);
const rel = (await como(A, `select relatorio_caixa($1, $2::date, $2::date) r`, [barb, ter])).rows[0].r;
ok(rel.atendimentos === 2 && Number(rel.total) === 80 && rel.qtd_promocoes === 2 && rel.cancelados === 1, `relatório: ${JSON.stringify({ a: rel.atendimentos, t: rel.total, p: rel.qtd_promocoes, c: rel.cancelados })}`);
ok(rel.por_pagamento.length === 2, "relatório separa pix e dinheiro");
ok((await erro(B, `select relatorio_caixa($1, $2::date, $2::date)`, [barb, ter]))?.includes("Sem acesso"), "cliente não vê relatório");

// segurança da assinatura
ok((await erro(A, `update barbearias set assinatura_status='ativa' where id=$1`, [barb])) !== null, "barbeiro não muda a própria assinatura");
ok((await como(B, `update barbearias set nome='Hackeado' where id=$1 returning id`, [barb])).rows.length === 0, "outro usuário não edita a barbearia");
ok((await como(A, `update barbearias set nome='Barbearia do João!' where id=$1 returning id`, [barb])).rows.length === 1, "dono edita a barbearia");
await db.query(`update barbearias set assinatura_status='suspensa' where id=$1`, [barb]);
ok((await erro(B, `select agendar($1,$2,$3::timestamptz,$4::uuid[])`, [barb, prof.id, ts(ter, "16:00"), [sv["Barba"]]]))?.includes("pausado"), "suspensa: cliente não agenda");
ok((await como(A, `update servicos set preco = 1 where barbearia_id=$1 returning id`, [barb])).rows.length === 0, "suspensa: barbeiro não edita");
ok((await como(A, `select id from agendamentos`)).rows.length > 0, "suspensa: barbeiro ainda consegue ver os dados");

console.log(falhas ? `\n${falhas} FALHA(S)` : "\nTudo certo");
process.exit(falhas ? 1 : 0);
