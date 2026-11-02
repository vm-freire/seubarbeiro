"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { traduzirErro } from "@/lib/site";
import { destinoSeguro } from "../destino";

export function FormCadastro({ proximo, barbeiro }: { proximo?: string; barbeiro: boolean }) {
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const destino = destinoSeguro(proximo, barbeiro ? "/painel" : "/meus-agendamentos");

  async function cadastrar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const f = new FormData(e.currentTarget);
    const telefone = String(f.get("telefone")).replace(/\D/g, "");
    if (telefone.length < 10) {
      setErro("Informe o WhatsApp com DDD, por exemplo (41) 99999-8888.");
      return;
    }
    setEnviando(true);
    const { data, error } = await createClient().auth.signUp({
      email: String(f.get("email")).trim(),
      password: String(f.get("senha")),
      options: {
        // cliente e barbeiro são contas separadas (o tipo não muda depois)
        data: { nome: String(f.get("nome")).trim(), telefone, tipo: barbeiro ? "profissional" : "cliente" },
        emailRedirectTo: `${window.location.origin}${destino}`,
      },
    });
    setEnviando(false);
    if (error) return setErro(traduzirErro(error));
    if (!data.session) {
      setAviso("Conta criada! Enviamos um link para o seu e-mail. Abra o link para ativar a conta e depois entre.");
      return;
    }
    window.location.assign(destino);
  }

  if (aviso) return <p className="aviso selo-verde block">{aviso}</p>;

  return (
    <form onSubmit={cadastrar} className="space-y-4">
      <div>
        <label className="rotulo" htmlFor="nome">Seu nome</label>
        <input id="nome" name="nome" autoComplete="name" required minLength={2} maxLength={80} className="campo" />
      </div>
      <div>
        <label className="rotulo" htmlFor="telefone">WhatsApp (com DDD)</label>
        <input id="telefone" name="telefone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="(41) 99999-8888" className="campo" />
        <p className="ajuda">{barbeiro ? "Seu WhatsApp de contato." : "É por aqui que a barbearia confirma o seu horário."}</p>
      </div>
      <div>
        <label className="rotulo" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="campo" />
      </div>
      <div>
        <label className="rotulo" htmlFor="senha">Senha</label>
        <input id="senha" name="senha" type="password" autoComplete="new-password" required minLength={6} className="campo" />
        <p className="ajuda">Pelo menos 6 caracteres.</p>
      </div>
      {erro && <p className="aviso selo-vermelho block" role="alert">{erro}</p>}
      <button className="btn-primario w-full" disabled={enviando}>{enviando ? "Criando…" : barbeiro ? "Criar conta de barbeiro" : "Criar conta de cliente"}</button>
      <p className="text-center text-sm text-suave">
        Já tem conta?{" "}
        <Link className="font-medium text-destaque underline" href={`/entrar${proximo ? `?proximo=${encodeURIComponent(proximo)}` : ""}`}>
          Entrar
        </Link>
      </p>
    </form>
  );
}
