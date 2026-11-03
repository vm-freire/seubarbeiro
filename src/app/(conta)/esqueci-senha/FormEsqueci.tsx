"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { comLimite, traduzirErro } from "@/lib/site";
import { pedirRecuperacao } from "../acoes";

/**
 * Pede o e-mail de recuperação. O site envia em português pelo Resend
 * (ação pedirRecuperacao); sem Resend configurado, usa o envio do
 * Supabase. A resposta é a mesma exista ou não a conta, para ninguém
 * descobrir quais e-mails estão cadastrados.
 */
export function FormEsqueci() {
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    const email = String(new FormData(e.currentTarget).get("email")).trim();
    try {
      const r = await comLimite(pedirRecuperacao(email));
      if (r.usarSupabase) {
        const { error } = await comLimite(
          createClient().auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/confirmar?proximo=/redefinir-senha`,
          }),
        );
        if (error) setErro(traduzirErro(error));
        else setEnviado(email);
      } else if (r.erro) setErro(r.erro);
      else setEnviado(email);
    } catch (err) {
      setErro(traduzirErro(err as Error));
    }
    setEnviando(false);
  }

  if (enviado) {
    return (
      <div className="space-y-4">
        <p className="aviso selo-verde block" role="status">
          Pronto! Se existir uma conta com <strong>{enviado}</strong>, o link para criar uma senha nova chega em alguns minutos.
        </p>
        <p className="text-sm text-suave">Não chegou? Olhe a caixa de spam ou lixo eletrônico. O link vale por 1 hora.</p>
        <button type="button" className="btn w-full" onClick={() => setEnviado(null)}>Enviar de novo</button>
        <p className="text-center text-sm">
          <Link className="font-medium text-destaque underline" href="/entrar">Voltar para Entrar</Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <div>
        <label className="rotulo" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="campo" />
      </div>
      {erro && <p className="aviso selo-vermelho block" role="alert">{erro}</p>}
      <button className="btn-primario w-full" disabled={enviando}>{enviando ? "Enviando…" : "Enviar link de recuperação"}</button>
      <p className="text-center text-sm text-suave">
        Lembrou?{" "}
        <Link className="font-medium text-destaque underline" href="/entrar">Entrar</Link>
      </p>
    </form>
  );
}
