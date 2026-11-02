"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { erroDeEnvio, reduzirFoto } from "@/lib/imagem";
import { createClient } from "@/lib/supabase/client";
import { adicionarTrabalho } from "../acoes";

/**
 * Envia várias fotos de uma vez para a galeria. Reduz no celular, sobe para
 * o Storage e grava cada uma. Caminho: <barbearia>/<profissional>/trabalhos/...
 * ou <barbearia>/galeria/... (foto "da barbearia", só o dono).
 */
export function EnviarTrabalhos({
  barbeariaId,
  profissionais,
  dono,
  meuProfissionalId,
}: {
  barbeariaId: string;
  profissionais: { id: string; nome: string }[];
  dono: boolean;
  meuProfissionalId: string | null;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [profissionalId, setProfissionalId] = useState(dono ? "" : meuProfissionalId ?? "");
  const [legenda, setLegenda] = useState("");
  const [progresso, setProgresso] = useState<{ feitas: number; total: number } | null>(null);
  const [mensagem, setMensagem] = useState<{ erro?: string; ok?: string }>({});

  async function enviar(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(e.target.files ?? []).filter((a) => a.type.startsWith("image/"));
    e.target.value = "";
    if (!arquivos.length) return;
    setMensagem({});
    setProgresso({ feitas: 0, total: arquivos.length });
    const supabase = createClient();
    let enviadas = 0;
    let erro = "";
    for (const [i, arquivo] of arquivos.entries()) {
      try {
        const blob = await reduzirFoto(arquivo, 1600);
        const pasta = profissionalId ? `${profissionalId}/trabalhos` : "galeria";
        const caminho = `${barbeariaId}/${pasta}/${Date.now()}-${i}.jpg`;
        const { error } = await supabase.storage.from("fotos").upload(caminho, blob, { contentType: "image/jpeg" });
        if (error) throw error;
        const url = supabase.storage.from("fotos").getPublicUrl(caminho).data.publicUrl;
        const r = await adicionarTrabalho({ url, caminho, profissionalId: profissionalId || null, legenda });
        if (r?.erro) throw new Error(r.erro);
        enviadas++;
      } catch (err) {
        erro = erroDeEnvio(err);
        break; // limite cheio ou sem permissão: não adianta tentar as outras
      }
      setProgresso({ feitas: i + 1, total: arquivos.length });
    }
    setProgresso(null);
    setLegenda("");
    setMensagem(erro ? { erro: enviadas ? `${enviadas} foto(s) enviada(s). Depois parou: ${erro}` : erro } : { ok: `${enviadas} foto(s) adicionada(s) à galeria.` });
    router.refresh();
  }

  const enviando = !!progresso;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {dono ? (
          <div>
            <label className="rotulo" htmlFor="foto-prof">De quem é o trabalho?</label>
            <select id="foto-prof" className="campo" value={profissionalId} onChange={(e) => setProfissionalId(e.target.value)} disabled={enviando}>
              <option value="">Da barbearia (sem nome)</option>
              {profissionais.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
        ) : null}
        <div>
          <label className="rotulo" htmlFor="foto-legenda">Legenda (opcional)</label>
          <input
            id="foto-legenda"
            className="campo"
            maxLength={120}
            placeholder="Ex.: Degradê com risca"
            value={legenda}
            onChange={(e) => setLegenda(e.target.value)}
            disabled={enviando}
          />
        </div>
      </div>
      <input ref={input} type="file" accept="image/*" multiple className="sr-only" onChange={enviar} aria-label="Escolher fotos" />
      <button type="button" className="btn-primario" onClick={() => input.current?.click()} disabled={enviando || (!dono && !meuProfissionalId)}>
        {progresso ? `Enviando ${progresso.feitas + 1} de ${progresso.total}…` : "Escolher fotos"}
      </button>
      <p className="ajuda">Pode escolher várias de uma vez. As fotos são reduzidas no próprio celular antes de enviar.</p>
      {mensagem.erro && <p className="aviso selo-vermelho block" role="alert">{mensagem.erro}</p>}
      {mensagem.ok && <p className="aviso selo-verde block" role="status">{mensagem.ok}</p>}
    </div>
  );
}
