"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { traduzirErro } from "@/lib/site";
import { destinoSeguro } from "../destino";

export function FormEntrar({ proximo }: { proximo?: string }) {
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    const f = new FormData(e.currentTarget);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(f.get("email")).trim(),
      password: String(f.get("senha")),
    });
    if (error) {
      setErro(traduzirErro(error));
      setEnviando(false);
      return;
    }
    // barbeiro vai para o painel; cliente para os horários (ou para onde estava)
    const { data: perfil } = await supabase.from("perfis").select("tipo").eq("id", data.user.id).maybeSingle();
    const profissional = perfil?.tipo === "profissional";
    let destino = destinoSeguro(proximo, profissional ? "/painel" : "/meus-agendamentos");
    if (!profissional && destino.startsWith("/painel")) destino = "/meus-agendamentos?aviso=cliente";
    // navegação completa (de propósito) para o servidor já enxergar a sessão nova
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
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
