import type { NextRequest } from "next/server";
import { gerarPlanilhaRelatorio } from "@/lib/relatorio/planilha";
import { dadosDaRota, erroRelatorio } from "@/lib/relatorio/rota";

export const runtime = "nodejs";

/** Relatório de caixa em Excel (mesmos filtros da tela de Relatórios). */
export async function GET(req: NextRequest) {
  const { d, geradoEm, nome } = await dadosDaRota(req);
  if (!d.r) return erroRelatorio();
  const xlsx = await gerarPlanilhaRelatorio(d, geradoEm);
  return new Response(new Uint8Array(xlsx), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nome}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
