"use client";

import Link from "next/link";
import { useState } from "react";
import { CampoSenha } from "@/components/CampoSenha";
import { createClient } from "@/lib/supabase/client";
import { comLimite, traduzirErro } from "@/lib/site";
import { destinoSeguro } from "../destino";

export function FormEntrar({ proximo }: { proximo?: string }) {
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    const f = new FormData(e.currentTarget);
    try {
      const supabase = createClient();
      const { data, error } = await comLimite(
        supabase.auth.signInWithPassword({
          email: String(f.get("email")).trim(),
          password: String(f.get("senha")),
        }),
      );
      if (error) {
        setErro(traduzirErro(error));
        setEnviando(false);
        return;
      }
      // barbeiro vai para o painel; cliente para os horários (ou para onde estava)
      const { data: perfil } = await comLimite(supabase.from("perfis").select("tipo").eq("id", data.user.id).maybeSingle());
      const profissional = perfil?.tipo === "profissional";
      let destino = destinoSeguro(proximo, profissional ? "/painel" : "/meus-agendamentos");
      if (!profissional && destino.startsWith("/painel")) destino = "/meus-agendamentos?aviso=cliente";
      // navegação completa (de propósito) para o servidor já enxergar a sessão nova
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(destino);
    } catch (err) {
      setErro(traduzirErro(err as Error));
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={entrar} className="space-y-4">
      <div>
        <label className="rotulo" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="campo" />
      </div>
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <label className="rotulo" htmlFor="senha">Senha</label>
          <Link href="/esqueci-senha" className="text-sm font-medium text-destaque underline">Esqueci minha senha</Link>
        </div>
        <CampoSenha id="senha" autoComplete="current-password" required />
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
