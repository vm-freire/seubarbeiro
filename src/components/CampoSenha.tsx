"use client";

import { useState } from "react";

/** Campo de senha com o "olhinho" para mostrar/esconder o que foi digitado. */
export function CampoSenha({ id, name = id, ...resto }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & { id: string }) {
  const [visivel, setVisivel] = useState(false);
  return (
    <div className="relative">
      <input id={id} name={name} type={visivel ? "text" : "password"} className="campo pr-12" autoCapitalize="none" spellCheck={false} {...resto} />
      <button
        type="button"
        onClick={() => setVisivel((v) => !v)}
        aria-label={visivel ? "Esconder senha" : "Mostrar senha"}
        aria-pressed={visivel}
        aria-controls={id}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-[inherit] text-suave transition hover:text-texto focus-visible:text-texto"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {visivel && <path d="M3 3l18 18" />}
        </svg>
      </button>
    </div>
  );
}
