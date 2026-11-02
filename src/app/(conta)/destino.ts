/** Só aceita caminhos internos (evita redirecionar para outro site). */
export function destinoSeguro(proximo: string | null | undefined, padrao = "/") {
  if (!proximo || !proximo.startsWith("/") || proximo.startsWith("//") || proximo.startsWith("/\\")) return padrao;
  return proximo;
}
