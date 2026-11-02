"use client";

/**
 * Botão sol/lua. Sem escolha, o site segue o tema do aparelho; depois do
 * clique, a escolha fica salva neste aparelho (localStorage "tema").
 * Os dois ícones vêm no HTML e o CSS mostra o certo (.so-claro / .so-escuro),
 * então não há piscada nem diferença entre servidor e navegador.
 */
export function BotaoTema() {
  function alternar() {
    const raiz = document.documentElement;
    const escuroAgora =
      raiz.dataset.tema === "escuro" ||
      (raiz.dataset.tema !== "claro" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    const novo = escuroAgora ? "claro" : "escuro";
    raiz.dataset.tema = novo;
    try {
      localStorage.setItem("tema", novo);
    } catch {
      // aba anônima / armazenamento bloqueado: vale só até fechar a página
    }
  }

  return (
    <button
      type="button"
      onClick={alternar}
      className="btn btn-pequeno aspect-square px-0"
      aria-label="Alternar entre tema claro e escuro"
      title="Tema claro / escuro"
    >
      {/* No tema claro mostra a lua (vai para o escuro); no escuro, o sol. */}
      <svg className="so-claro" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
      <svg className="so-escuro" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </button>
  );
}
