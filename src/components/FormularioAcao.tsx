"use client";

import { useActionState, useEffect, useRef } from "react";
import type { ResultadoAcao } from "@/lib/tipos";

type Acao = (anterior: ResultadoAcao, dados: FormData) => Promise<ResultadoAcao>;

/**
 * Formulário que chama uma Server Action e mostra o erro/sucesso embaixo.
 * `limparAoSalvar` zera os campos quando dá certo (bom para "adicionar").
 */
export function FormularioAcao({
  acao,
  children,
  className,
  limparAoSalvar = false,
}: {
  acao: Acao;
  children: React.ReactNode;
  className?: string;
  limparAoSalvar?: boolean;
}) {
  const [estado, executar, pendente] = useActionState(acao, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (limparAoSalvar && estado?.ok) ref.current?.reset();
  }, [estado, limparAoSalvar]);

  return (
    <form ref={ref} action={executar} className={className} aria-busy={pendente}>
      <fieldset disabled={pendente} className="contents">
        {children}
      </fieldset>
      <div aria-live="polite" className="empty:hidden">
        {estado?.erro && <p className="aviso selo-vermelho mt-2 block">{estado.erro}</p>}
        {estado?.ok && <p className="aviso selo-verde mt-2 block">{estado.ok}</p>}
      </div>
    </form>
  );
}
