"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { traduzirErro } from "@/lib/site";
import { destinoSeguro } from "../destino";

export function FormEntrar({ proximo }: { proximo?: string }) {
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const destino = destinoSeguro(proximo);

  async function entrar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    const f = new FormData(e.currentTarget);
    const { error } = await createClient().auth.signInWithPassword({
      email: String(f.get("email")).trim(),
      password: String(f.get("senha")),
    });
    if (error) {
      setErro(traduzirErro(error));
      setEnviando(false);
      return;
    }
    // navegação completa para o servidor já enxergar a sessão nova
    window.location.assign(destino);
  }

  return (
    <form onSubmit={entrar} className="space-y-4">
      <div>
        <label className="rotulo" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="campo" />
      </div>
      <div>
        <label className="rotulo" htmlFor="senha">Senha</label>
        <input id="senha" name="senha" type="password" autoComplete="current-password" required className="campo" />
        <p className="ajuda">Você continua conectado neste aparelho até tocar em Sair.</p>
      </div>
      {erro && <p className="aviso selo-vermelho block" role="alert">{erro}</p>}
      <button className="btn-primario w-full" disabled={enviando}>{enviando ? "Entrando…" : "Entrar"}</button>
      <p className="text-center text-sm text-suave">
        Ainda não tem conta?{" "}
        <Link className="font-medium text-destaque underline" href={`/cadastro${proximo ? `?proximo=${encodeURIComponent(proximo)}` : ""}`}>
          Criar conta rápida
        </Link>
      </p>
    </form>
  );
}
