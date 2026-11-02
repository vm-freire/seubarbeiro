import "server-only";
import { exigirBarbearia } from "../painel";
import { hojeLocal } from "../tempo";
import { periodo, periodoAnterior, type Busca, type Relatorio } from "./calculos";

/**
 * Busca o relatório (e o do período anterior, para comparar) do jeito que a
 * tela, o PDF e a planilha usam. Quem pode ver o quê é o banco que decide
 * (relatorio_caixa): barbeiro sempre recebe só o dele.
 */
export async function carregarRelatorio(sp: Busca) {
  const { supabase, barbearia: b, dono, meuProfissional } = await exigirBarbearia();
  const hoje = hojeLocal(b.fuso);
  const { p, de, ate } = periodo(sp, hoje);
  const { data: equipe } = dono
    ? await supabase.from("profissionais").select("id, nome").eq("barbearia_id", b.id).order("ordem").order("nome")
    : { data: [] as { id: string; nome: string }[] };
  const prof = dono ? ((equipe ?? []).find((x) => x.id === sp.prof)?.id ?? null) : (meuProfissional?.id ?? null);
  const nomeProf = (dono ? (equipe ?? []).find((x) => x.id === prof)?.nome : meuProfissional?.nome) ?? null;
  const ant = periodoAnterior(de, ate);
  const [atual, anterior] = await Promise.all([
    supabase.rpc("relatorio_caixa", { p_barbearia: b.id, p_de: de, p_ate: ate, p_profissional: prof }),
    supabase.rpc("relatorio_caixa", { p_barbearia: b.id, p_de: ant.de, p_ate: ant.ate, p_profissional: prof }),
  ]);
  return {
    barbearia: b,
    dono,
    equipe: equipe ?? [],
    prof,
    nomeProf,
    p,
    de,
    ate,
    anteriorDe: ant.de,
    anteriorAte: ant.ate,
    r: (atual.data as Relatorio | null) ?? null,
    anterior: (anterior.data as Relatorio | null) ?? null,
    erro: atual.error,
  };
}

export type DadosRelatorio = Awaited<ReturnType<typeof carregarRelatorio>>;

/** Nome do arquivo baixado: relatorio-barbearia-2026-11-01_2026-11-30 */
export function nomeArquivo(d: DadosRelatorio) {
  const prof = d.nomeProf ? `-${d.nomeProf.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase()}` : "";
  return `relatorio-${d.barbearia.slug}${prof}-${d.de === d.ate ? d.de : `${d.de}_${d.ate}`}`;
}
