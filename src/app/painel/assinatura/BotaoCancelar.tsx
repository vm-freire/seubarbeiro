"use client";

import { useActionState, useState } from "react";
import { cancelar } from "./acoes";

/** Cancelar pede um segundo toque, para não cancelar sem querer. */
export function BotaoCancelar() {
  const [estado, acao, pendente] = useActionState(cancelar, null);
  const [certeza, setCerteza] = useState(false);

  return (
    <form action={acao} className="space-y-2">
      {certeza ? (
        <>
          <p className="text-sm">Cancelar a assinatura? A agenda funciona até o fim do período pago. Depois fica bloqueada, mas nada é apagado: dá para assinar de novo quando quiser.</p>
          <div className="flex flex-wrap gap-2">
            <button className="btn-perigo btn-pequeno" disabled={pendente}>{pendente ? "Cancelando…" : "Sim, cancelar"}</button>
            <button type="button" className="btn btn-pequeno" onClick={() => setCerteza(false)} disabled={pendente}>Voltar</button>
          </div>
        </>
      ) : (
        <button type="button" className="btn btn-pequeno" onClick={() => setCerteza(true)}>Cancelar assinatura</button>
      )}
      {estado?.erro && <p className="aviso selo-vermelho block" role="alert">{estado.erro}</p>}
      {estado?.ok && <p className="aviso selo-verde block">{estado.ok}</p>}
    </form>
  );
}
