"use client";

import { useState } from "react";
import { CampoSenha } from "@/components/CampoSenha";
import { createClient } from "@/lib/supabase/client";
import { comLimite, traduzirErro } from "@/lib/site";

export function FormRedefinir() {
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function salvar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const f = new FormData(e.currentTarget);
    const senha = String(f.get("senha"));
    if (senha.length < 6) return setErro("A senha precisa ter pelo menos 6 caracteres.");
    if (senha !== String(f.get("repetir"))) return setErro("As duas senhas não são iguais. Digite de novo.");
    setEnviando(true);
    try {
      const supabase = createClient();
      const { data, error } = await comLimite(supabase.auth.updateUser({ password: senha }));
      if (error) {
        setErro(traduzirErro(error));
        setEnviando(false);
        return;
      }
      // barbeiro vai para o painel; cliente para os horários
      const { data: perfil } = await comLimite(supabase.from("perfis").select("tipo").eq("id", data.user.id).maybeSingle());
      window.location.assign(perfil?.tipo === "profissional" ? "/painel" : "/meus-agendamentos");
    } catch (err) {
      setErro(traduzirErro(err as Error));
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <div>
        <label className="rotulo" htmlFor="senha">Senha nova</label>
        <CampoSenha id="senha" autoComplete="new-password" required minLength={6} />
        <p className="ajuda">Pelo menos 6 caracteres.</p>
      </div>
      <div>
        <label className="rotulo" htmlFor="repetir">Repita a senha nova</label>
        <CampoSenha id="repetir" autoComplete="new-password" required minLength={6} />
      </div>
      {erro && <p className="aviso selo-vermelho block" role="alert">{erro}</p>}
      <button className="btn-primario w-full" disabled={enviando}>{enviando ? "Salvando…" : "Salvar senha nova"}</button>
    </form>
  );
}
