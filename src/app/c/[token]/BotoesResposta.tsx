"use client";

import { useActionState } from "react";
import { responder } from "./acoes";

export function BotoesResposta({ token, status }: { token: string; status: string }) {
  const [estado, acao, pendente] = useActionState(responder, null);

  return (
    <form action={acao} className="space-y-2">
      <input type="hidden" name="token" value={token} />
      <div className="grid grid-cols-2 gap-2">
        <button name="vai" value="sim" className="btn-primario" disabled={pendente || status === "confirmado"}>
          {status === "confirmado" ? "✓ Confirmado" : "Vou"}
        </button>
        <button name="vai" value="nao" className="btn-perigo" disabled={pendente}>
          Não vou
        </button>
      </div>
      {estado?.erro && <p className="aviso selo-vermelho block" role="alert">{estado.erro}</p>}
    </form>
  );
}
