/** Reduz a foto no próprio celular antes de enviar (fica leve e rápida). Só no navegador. */
export async function reduzirFoto(arquivo: File, maximo: number): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, maximo / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((ok, falha) => canvas.toBlob((b) => (b ? ok(b) : falha(new Error("imagem"))), "image/jpeg", 0.85));
}

/** Traduz o erro do Storage para o barbeiro. */
export function erroDeEnvio(err: unknown) {
  const msg = err instanceof Error ? err.message : "";
  if (/row-level|policy|Unauthorized|403/i.test(msg)) return "Você não tem permissão para enviar esta foto.";
  if (/exceeded|too large|413/i.test(msg)) return "A foto é grande demais.";
  return msg || "Não foi possível enviar a foto.";
}
