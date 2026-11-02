"use client";

import { useActionState, useState } from "react";
import { desmarcar } from "./acoes";

/** "Desmarcar horário" pede um segundo toque para não desmarcar sem querer. */
export function BotaoDesmarcar({ token }: { token: string }) {
  const [estado, acao, pendente] = useActionState(desmarcar, null);
  const [certeza, setCerteza] = useState(false);

  return (
    <form action={acao} className="space-y-2">
      <input type="hidden" name="token" value={token} />
      {certeza ? (
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-perigo" disabled={pendente}>{pendente ? "Desmarcando…" : "Sim, desmarcar"}</button>
          <button type="button" className="btn" onClick={() => setCerteza(false)} disabled={pendente}>Voltar</button>
        </div>
      ) : (
        <button type="button" className="btn-perigo w-full" onClick={() => setCerteza(true)}>Desmarcar horário</button>
      )}
      {estado?.erro && <p className="aviso selo-vermelho block" role="alert">{estado.erro}</p>}
    </form>
  );
}
