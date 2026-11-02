import type { NextRequest } from "next/server";
import { gerarPdfRelatorio } from "@/lib/relatorio/RelatorioPdf";
import { dadosDaRota, erroRelatorio } from "@/lib/relatorio/rota";

export const runtime = "nodejs";

/** Relatório de caixa em PDF (mesmos filtros da tela de Relatórios). */
export async function GET(req: NextRequest) {
  const { d, geradoEm, nome } = await dadosDaRota(req);
  if (!d.r) return erroRelatorio();
  const pdf = await gerarPdfRelatorio(d, geradoEm);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nome}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
