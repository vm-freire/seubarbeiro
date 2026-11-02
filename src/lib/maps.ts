/** Link que abre o Google Maps já com a rota até a barbearia. */
export function linkRota(b: { maps_url?: string | null; endereco?: string | null; cidade?: string | null }) {
  if (b.maps_url && /^https?:\/\//.test(b.maps_url)) return b.maps_url;
  const destino = [b.endereco, b.cidade].filter(Boolean).join(", ");
  if (!destino) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}`;
}
