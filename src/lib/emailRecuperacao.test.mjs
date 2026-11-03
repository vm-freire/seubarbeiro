import { test } from "node:test";
import assert from "node:assert/strict";
import { emailRecuperacao } from "./emailRecuperacao.ts";

test("e-mail de recuperação: português, link no botão e no texto", () => {
  const link = "https://seubarbeiro-five.vercel.app/auth/confirmar?token_hash=abc&type=recovery&proximo=/redefinir-senha";
  const { assunto, texto, html } = emailRecuperacao(link);
  assert.equal(assunto, "Criar senha nova · Seu Barbeiro");
  assert.ok(texto.includes(link));
  // & vira &amp; dentro do HTML (o navegador desfaz ao abrir o link)
  assert.ok(html.includes('href="https://seubarbeiro-five.vercel.app/auth/confirmar?token_hash=abc&amp;type=recovery&amp;proximo=/redefinir-senha"'));
  assert.ok(html.includes("vale por 1 hora"));
  assert.ok(!emailRecuperacao('x"><script>').html.includes("<script>"));
});
