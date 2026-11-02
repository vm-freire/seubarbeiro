/**
 * Preço do serviço num dia, considerando promoções. Espelha a função
 * `preco_servico` do banco (o banco é quem vale na hora de gravar).
 */
import { diaSemana } from "./tempo.ts";

export type PromocaoPreco = {
  servico_id: string;
  nome: string;
  preco: number | string;
  dias_semana: number[] | null;
  data_inicio: string | null;
  data_fim: string | null;
  ativa: boolean;
};

export function precoDoDia(
  servico: { id: string; preco: number | string },
  promocoes: PromocaoPreco[],
  data: string
): { preco: number; precoTabela: number; promocao: string | null } {
  const tabela = Number(servico.preco);
  const dow = diaSemana(data);
  let melhor: { preco: number; nome: string } | null = null;
  for (const p of promocoes) {
    if (p.servico_id !== servico.id || !p.ativa) continue;
    if (p.data_inicio && data < p.data_inicio) continue;
    if (p.data_fim && data > p.data_fim) continue;
    if (p.dias_semana && p.dias_semana.length && !p.dias_semana.includes(dow)) continue;
    const v = Number(p.preco);
    if (!melhor || v < melhor.preco) melhor = { preco: v, nome: p.nome };
  }
  if (melhor && melhor.preco < tabela) return { preco: melhor.preco, precoTabela: tabela, promocao: melhor.nome };
  return { preco: tabela, precoTabela: tabela, promocao: null };
}
