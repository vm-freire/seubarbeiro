"use client";

import { useState } from "react";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { FormularioAcao } from "@/components/FormularioAcao";
import { criarBarbearia } from "./acoes";

function paraSlug(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function CriarBarbearia() {
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [mexeuNoSlug, setMexeuNoSlug] = useState(false);
  const slugFinal = mexeuNoSlug ? slug : paraSlug(nome);

  return (
    <FormularioAcao acao={criarBarbearia} className="space-y-4">
      <div>
        <label className="rotulo" htmlFor="nome">Nome da barbearia</label>
        <input id="nome" name="nome" required minLength={2} maxLength={80} className="campo" value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>
      <div>
        <label className="rotulo" htmlFor="slug">Link de agendamento</label>
        <div className="flex items-center gap-1">
          <span className="text-sm text-suave">/b/</span>
          <input
            id="slug"
            name="slug"
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            minLength={3}
            maxLength={40}
            className="campo"
            value={slugFinal}
            onChange={(e) => {
              setMexeuNoSlug(true);
              // enquanto digita, deixa o hífen no fim (o banco confere o formato final)
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 40));
            }}
          />
        </div>
        <p className="ajuda">Só letras minúsculas, números e hífen. É o link que você manda para os clientes.</p>
      </div>
      <BotaoEnviar className="btn-primario w-full" pendente="Criando…">Criar barbearia</BotaoEnviar>
    </FormularioAcao>
  );
}
