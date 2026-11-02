"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Foto = { id: string; url: string; legenda: string | null; profissional: string | null };

/**
 * Grade de fotos + visualização em tela cheia (<dialog>): setas, teclado
 * (← → Esc) e deslizar o dedo no celular.
 */
export function Galeria({ fotos, inicial }: { fotos: Foto[]; inicial?: string }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [aberta, setAberta] = useState<number | null>(() => {
    const i = fotos.findIndex((f) => f.id === inicial);
    return i >= 0 ? i : null;
  });
  const toque = useRef<number | null>(null);

  // abre/fecha o <dialog> conforme o estado
  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (aberta !== null && !d.open) d.showModal();
    if (aberta === null && d.open) d.close();
  }, [aberta]);

  const passar = (delta: number) => setAberta((i) => (i === null ? i : (i + delta + fotos.length) % fotos.length));

  const atual = aberta !== null ? fotos[aberta] : null;

  return (
    <>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
        {fotos.map((f, i) => (
          <li key={f.id}>
            <button
              type="button"
              onClick={() => setAberta(i)}
              className="group relative block aspect-square w-full overflow-hidden rounded-2xl bg-superficie-2"
              aria-label={`Abrir foto ${i + 1}${f.legenda ? `: ${f.legenda}` : ""}`}
            >
              <Image src={f.url} alt={f.legenda ?? ""} fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw" className="object-cover transition duration-500 group-hover:scale-105" />
              {f.legenda && (
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-2 pt-8 text-left text-xs font-semibold text-white sm:text-sm">{f.legenda}</span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogo}
        onClose={() => setAberta(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") passar(1);
          if (e.key === "ArrowLeft") passar(-1);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setAberta(null); // clique fora da foto
        }}
        onTouchStart={(e) => (toque.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (toque.current === null) return;
          const dx = e.changedTouches[0].clientX - toque.current;
          toque.current = null;
          if (Math.abs(dx) > 50) passar(dx < 0 ? 1 : -1);
        }}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-black/95 p-0 text-white backdrop:bg-black/80"
        aria-label="Foto ampliada"
      >
        {atual && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-3 p-3 text-sm">
              <span className="opacity-80">
                {aberta! + 1} de {fotos.length}
              </span>
              <button type="button" onClick={() => setAberta(null)} className="rounded-full bg-white/10 px-4 py-2 font-semibold hover:bg-white/20" autoFocus>
                Fechar ✕
              </button>
            </div>
            <div className="relative min-h-0 flex-1" onClick={() => setAberta(null)}>
              <Image key={atual.id} src={atual.url} alt={atual.legenda ?? "Trabalho"} fill sizes="100vw" className="object-contain" onClick={(e) => e.stopPropagation()} />
              {fotos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      passar(-1);
                    }}
                    className="absolute top-1/2 left-2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-2xl hover:bg-black/70"
                    aria-label="Foto anterior"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      passar(1);
                    }}
                    className="absolute top-1/2 right-2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-2xl hover:bg-black/70"
                    aria-label="Próxima foto"
                  >
                    ›
                  </button>
                </>
              )}
            </div>
            <div className="min-h-16 p-4 text-center">
              {atual.legenda && <p className="font-semibold">{atual.legenda}</p>}
              {atual.profissional && <p className="text-sm opacity-75">por {atual.profissional}</p>}
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
