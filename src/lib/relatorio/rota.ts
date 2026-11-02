import "server-only";
import type { NextRequest } from "next/server";
import { carregarRelatorio, nomeArquivo } from "./carregar";

/** Lê os filtros da URL (os mesmos da tela) e devolve os dados + data/hora de emissão. */
export async function dadosDaRota(req: NextRequest) {
  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const d = await carregarRelatorio(sp);
  const geradoEm = new Intl.DateTimeFormat("pt-BR", { timeZone: d.barbearia.fuso, dateStyle: "short", timeStyle: "short" }).format(new Date());
  return { d, geradoEm, nome: nomeArquivo(d) };
}

export function erroRelatorio() {
  return new Response("Não foi possível gerar o relatório. Volte à tela de Relatórios e tente de novo.", {
    status: 500,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
