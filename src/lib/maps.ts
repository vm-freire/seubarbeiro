/** Link que abre o Google Maps já com a rota até a barbearia. */
export function linkRota(b: { maps_url?: string | null; endereco?: string | null; cidade?: string | null }) {
  if (b.maps_url && /^https?:\/\//.test(b.maps_url)) return b.maps_url;
  const destino = [b.endereco, b.cidade].filter(Boolean).join(", ");
  if (!destino) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}`;
}

/**
 * Endereço do mapa embutido (iframe do Google Maps, sem chave de API).
 * Só funciona com endereço escrito: link curto do Maps não dá para embutir.
 */
export function linkMapaEmbutido(b: { endereco?: string | null; cidade?: string | null; nome?: string | null }) {
  const destino = [b.endereco, b.cidade].filter(Boolean).join(", ");
  if (!b.endereco || !destino) return null;
  return `https://www.google.com/maps?q=${encodeURIComponent(destino)}&hl=pt-BR&z=16&output=embed`;
}
