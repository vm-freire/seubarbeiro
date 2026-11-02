"use client";

export function BotaoImprimir() {
  return (
    <button type="button" className="btn nao-imprimir" onClick={() => window.print()}>
      Imprimir / salvar PDF
    </button>
  );
}
