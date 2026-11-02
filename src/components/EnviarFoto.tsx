"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { removerFoto, salvarFoto } from "@/app/painel/acoes";
import { erroDeEnvio, reduzirFoto } from "@/lib/imagem";
import { createClient } from "@/lib/supabase/client";

/**
 * Envia uma foto para o Storage (bucket "fotos") e grava o endereço.
 * Caminho: <barbearia>/<profissional | capa>/<horário>.jpg — o banco só
 * deixa o dono ou o próprio profissional enviar.
 */
export function EnviarFoto({
  barbeariaId,
  tipo,
  id,
  temFoto,
  rotulo = "Trocar foto",
  maximo = 900,
}: {
  barbeariaId: string;
  tipo: "profissional" | "capa";
  id: string;
  temFoto: boolean;
  rotulo?: string;
  maximo?: number;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<{ carregando?: boolean; erro?: string }>({});

  async function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    if (!arquivo.type.startsWith("image/")) return setEstado({ erro: "Escolha uma imagem (foto)." });
    setEstado({ carregando: true });
    try {
      const blob = await reduzirFoto(arquivo, maximo);
      const caminho = `${barbeariaId}/${tipo === "capa" ? "capa" : id}/${Date.now()}.jpg`;
      const supabase = createClient();
      const { error } = await supabase.storage.from("fotos").upload(caminho, blob, { contentType: "image/jpeg" });
      if (error) throw error;
      const url = supabase.storage.from("fotos").getPublicUrl(caminho).data.publicUrl;
      const r = await salvarFoto(tipo, id, url);
      if (r?.erro) throw new Error(r.erro);
      setEstado({});
      router.refresh();
    } catch (err) {
      setEstado({ erro: erroDeEnvio(err) });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input ref={input} type="file" accept="image/*" className="sr-only" onChange={escolher} aria-label={rotulo} />
      <button type="button" className="btn btn-pequeno" onClick={() => input.current?.click()} disabled={estado.carregando}>
        {estado.carregando ? "Enviando…" : rotulo}
      </button>
      {temFoto && !estado.carregando && (
        <button
          type="button"
          className="btn-perigo btn-pequeno"
          onClick={async () => {
            await removerFoto(tipo, id);
            router.refresh();
          }}
        >
          Remover
        </button>
      )}
      {estado.erro && <p className="aviso selo-vermelho w-full" role="alert">{estado.erro}</p>}
    </div>
  );
}
