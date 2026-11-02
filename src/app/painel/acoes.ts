"use server";

/**
 * Ações do painel do barbeiro. A permissão de verdade é do banco (RLS):
 * só membro da barbearia, com assinatura liberada, consegue gravar.
 * Aqui só validamos os campos e traduzimos os erros.
 */
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_BARBEARIA, contextoPainel, exigirBarbearia } from "@/lib/painel";
import { traduzirErro } from "@/lib/site";
import { dataValida, horaValida, localParaDate, somarDias } from "@/lib/tempo";
import type { ResultadoAcao } from "@/lib/tipos";
import { soDigitos } from "@/lib/whatsapp";

const txt = (d: FormData, k: string) => String(d.get(k) ?? "").trim();
const opcional = (d: FormData, k: string) => txt(d, k) || null;
const numero = (d: FormData, k: string) => {
  const v = Number(txt(d, k).replace(",", "."));
  return Number.isFinite(v) ? v : NaN;
};
const falha = (e: { message?: string } | null, padrao?: string): ResultadoAcao => ({ erro: traduzirErro(e, padrao) });

/** Confere se a gravação realmente aconteceu (RLS bloqueia em silêncio). */
function semEfeito(linhas: unknown[] | null): ResultadoAcao | null {
  return linhas && linhas.length > 0
    ? null
    : { erro: "Não foi possível salvar. Confira se a assinatura está em dia ou recarregue a página." };
}

// ---------------------------------------------------------------- barbearia

export async function criarBarbearia(_: ResultadoAcao, d: FormData): Promise<ResultadoAcao> {
  const { supabase } = await contextoPainel();
  const { data, error } = await supabase.rpc("criar_barbearia", { p_nome: txt(d, "nome"), p_slug: txt(d, "slug") });
  if (error) return falha(error);
  (await cookies()).set(COOKIE_BARBEARIA, String(data), { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  redirect("/painel");
}

export async function escolherBarbearia(d: FormData) {
  (await cookies()).set(COOKIE_BARBEARIA, txt(d, "id"), { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  redirect("/painel");
}

export async function salvarConfiguracoes(_: ResultadoAcao, d: FormData): Promise<ResultadoAcao> {
  const { supabase, barbearia } = await exigirBarbearia();
  const whatsapp = soDigitos(txt(d, "whatsapp"));
  const dados = {
    nome: txt(d, "nome"),
    slug: txt(d, "slug").toLowerCase(),
    descricao: opcional(d, "descricao"),
    endereco: opcional(d, "endereco"),
    cidade: opcional(d, "cidade"),
    maps_url: opcional(d, "maps_url"),
    whatsapp: whatsapp ? (whatsapp.length <= 11 ? `55${whatsapp}` : whatsapp) : null,
    instagram: opcional(d, "instagram"),
    passo_minutos: numero(d, "passo_minutos"),
    antecedencia_minima_min: numero(d, "antecedencia_minima_min"),
    lembrete_minutos: numero(d, "lembrete_minutos"),
  };
  if (dados.maps_url && !/^https?:\/\//.test(dados.maps_url)) return { erro: "O link do Google Maps precisa começar com https://" };
  const { data, error } = await supabase.from("barbearias").update(dados).eq("id", barbearia.id).select("id");
  if (error) {
    if (/duplicate|unique/i.test(error.message)) return { erro: "Esse link já está em uso por outra barbearia." };
    if (/check/i.test(error.message)) return { erro: "Algum valor está fora do permitido. Confira o link (só minúsculas, números e hífen)." };
    return falha(error);
  }
  revalidatePath("/", "layout");
  return semEfeito(data) ?? { ok: "Configurações salvas." };
}

// ---------------------------------------------------------------- serviços

const CATEGORIAS_OK = ["corte", "barba", "sobrancelha", "combo", "outro"];

export async function salvarServico(_: ResultadoAcao, d: FormData): Promise<ResultadoAcao> {
  const { supabase, barbearia } = await exigirBarbearia();
  const id = txt(d, "id");
  const dados = {
    nome: txt(d, "nome"),
    descricao: opcional(d, "descricao"),
    categoria: CATEGORIAS_OK.includes(txt(d, "categoria")) ? txt(d, "categoria") : "outro",
    preco: numero(d, "preco"),
    duracao_min: numero(d, "duracao_min"),
    ativo: d.get("ativo") === "on",
    ordem: Number.isFinite(numero(d, "ordem")) ? numero(d, "ordem") : 0,
  };
  if (!dados.nome) return { erro: "Dê um nome ao serviço." };
  if (!(dados.preco >= 0)) return { erro: "Preço inválido." };
  if (!(dados.duracao_min >= 5 && dados.duracao_min <= 480)) return { erro: "A duração precisa ficar entre 5 e 480 minutos." };

  const q = id
    ? supabase.from("servicos").update(dados).eq("id", id).select("id")
    : supabase.from("servicos").insert({ ...dados, barbearia_id: barbearia.id }).select("id");
  const { data, error } = await q;
  if (error) return falha(error);
  revalidatePath("/painel/servicos");
  return semEfeito(data) ?? { ok: id ? "Serviço atualizado." : "Serviço adicionado." };
}

export async function removerServico(d: FormData) {
  const { supabase } = await exigirBarbearia();
  await supabase.from("servicos").delete().eq("id", txt(d, "id"));
  revalidatePath("/painel/servicos");
}

export async function salvarPromocao(_: ResultadoAcao, d: FormData): Promise<ResultadoAcao> {
  const { supabase, barbearia } = await exigirBarbearia();
  const dias = d.getAll("dias").map(Number).filter((n) => n >= 0 && n <= 6);
  const dados = {
    barbearia_id: barbearia.id,
    servico_id: txt(d, "servico_id"),
    nome: txt(d, "nome") || "Promoção",
    preco: numero(d, "preco"),
    dias_semana: dias.length && dias.length < 7 ? dias : null,
    data_inicio: dataValida(txt(d, "data_inicio")) ? txt(d, "data_inicio") : null,
    data_fim: dataValida(txt(d, "data_fim")) ? txt(d, "data_fim") : null,
  };
  if (!dados.servico_id) return { erro: "Escolha o serviço." };
  if (!(dados.preco >= 0)) return { erro: "Preço promocional inválido." };
  if (dados.data_inicio && dados.data_fim && dados.data_fim < dados.data_inicio) return { erro: "A data final é antes da inicial." };
  const { data, error } = await supabase.from("promocoes").insert(dados).select("id");
  if (error) return falha(error);
  revalidatePath("/painel/servicos");
  return semEfeito(data) ?? { ok: "Promoção criada." };
}

export async function alternarPromocao(d: FormData) {
  const { supabase } = await exigirBarbearia();
  await supabase.from("promocoes").update({ ativa: d.get("ativa") === "1" }).eq("id", txt(d, "id"));
  revalidatePath("/painel/servicos");
}

export async function removerPromocao(d: FormData) {
  const { supabase } = await exigirBarbearia();
  await supabase.from("promocoes").delete().eq("id", txt(d, "id"));
  revalidatePath("/painel/servicos");
}

// ---------------------------------------------------------------- horários

export async function salvarHorariosSemana(_: ResultadoAcao, d: FormData): Promise<ResultadoAcao> {
  const { supabase, barbearia } = await exigirBarbearia();
  const profissional = txt(d, "profissional_id");
  const linhas: { barbearia_id: string; profissional_id: string; dia_semana: number; inicio: string; fim: string }[] = [];

  for (let dia = 0; dia <= 6; dia++) {
    if (d.get(`atende_${dia}`) !== "on") continue;
    for (const n of [1, 2]) {
      const ini = txt(d, `i${n}_${dia}`);
      const fim = txt(d, `f${n}_${dia}`);
      if (!ini && !fim) continue;
      if (!horaValida(ini) || !horaValida(fim)) return { erro: "Preencha os horários no formato HH:MM." };
      if (fim <= ini) return { erro: "O horário de saída precisa ser depois do de entrada." };
      linhas.push({ barbearia_id: barbearia.id, profissional_id: profissional, dia_semana: dia, inicio: ini, fim });
    }
    const doDia = linhas.filter((l) => l.dia_semana === dia).sort((a, b) => a.inicio.localeCompare(b.inicio));
    if (doDia.length === 2 && doDia[1].inicio < doDia[0].fim) return { erro: "Os dois períodos do mesmo dia estão se sobrepondo." };
  }

  const { error: e1 } = await supabase.from("horarios_semana").delete().eq("profissional_id", profissional);
  if (e1) return falha(e1);
  if (linhas.length) {
    const { data, error } = await supabase.from("horarios_semana").insert(linhas).select("id");
    if (error) return falha(error);
    const sem = semEfeito(data);
    if (sem) return sem;
  }
  revalidatePath("/painel/horarios");
  return { ok: "Horários da semana salvos." };
}

export async function salvarAgendaAberta(_: ResultadoAcao, d: FormData): Promise<ResultadoAcao> {
  const { supabase, barbearia } = await exigirBarbearia();
  const dias = numero(d, "dias_agenda_aberta");
  const ate = txt(d, "agenda_aberta_ate");
  if (!(dias >= 1 && dias <= 120)) return { erro: "Escolha entre 1 e 120 dias." };
  const { data, error } = await supabase
    .from("barbearias")
    .update({ dias_agenda_aberta: dias, agenda_aberta_ate: dataValida(ate) ? ate : null })
    .eq("id", barbearia.id)
    .select("id");
  if (error) return falha(error);
  revalidatePath("/painel/horarios");
  return semEfeito(data) ?? { ok: "Abertura da agenda salva." };
}

export async function adicionarBloqueio(_: ResultadoAcao, d: FormData): Promise<ResultadoAcao> {
  const { supabase, barbearia } = await exigirBarbearia();
  const de = txt(d, "data_inicio");
  const ate = txt(d, "data_fim") || de;
  if (!dataValida(de) || !dataValida(ate) || ate < de) return { erro: "Confira as datas." };
  const diaInteiro = d.get("dia_inteiro") === "on";
  const hi = diaInteiro ? "00:00" : txt(d, "hora_inicio");
  const hf = diaInteiro ? "00:00" : txt(d, "hora_fim");
  if (!diaInteiro && (!horaValida(hi) || !horaValida(hf))) return { erro: "Informe a hora de início e de fim, ou marque “dia inteiro”." };

  const inicio = localParaDate(de, hi, barbearia.fuso);
  const fim = diaInteiro ? localParaDate(somarDias(ate, 1), "00:00", barbearia.fuso) : localParaDate(ate, hf, barbearia.fuso);
  if (fim <= inicio) return { erro: "O fim precisa ser depois do início." };

  const { data, error } = await supabase
    .from("bloqueios")
    .insert({
      barbearia_id: barbearia.id,
      profissional_id: txt(d, "profissional_id") || null,
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
      motivo: opcional(d, "motivo"),
    })
    .select("id");
  if (error) return falha(error);
  revalidatePath("/painel", "layout");
  return semEfeito(data) ?? { ok: "Bloqueio adicionado. Esses horários não aparecem mais para os clientes." };
}

/** Atalho da agenda: "não vou atender neste dia". */
export async function bloquearDia(d: FormData) {
  const { supabase, barbearia } = await exigirBarbearia();
  const dia = txt(d, "data");
  if (!dataValida(dia)) return;
  await supabase.from("bloqueios").insert({
    barbearia_id: barbearia.id,
    profissional_id: txt(d, "profissional_id") || null,
    inicio: localParaDate(dia, "00:00", barbearia.fuso).toISOString(),
    fim: localParaDate(somarDias(dia, 1), "00:00", barbearia.fuso).toISOString(),
    motivo: "Dia fechado",
  });
  revalidatePath("/painel", "layout");
}

export async function removerBloqueio(d: FormData) {
  const { supabase } = await exigirBarbearia();
  await supabase.from("bloqueios").delete().eq("id", txt(d, "id"));
  revalidatePath("/painel", "layout");
}

export async function adicionarExtra(_: ResultadoAcao, d: FormData): Promise<ResultadoAcao> {
  const { supabase, barbearia } = await exigirBarbearia();
  const dia = txt(d, "data");
  const hi = txt(d, "hora_inicio");
  const hf = txt(d, "hora_fim");
  if (!dataValida(dia) || !horaValida(hi) || !horaValida(hf) || hf <= hi) return { erro: "Confira a data e os horários." };
  const { data, error } = await supabase
    .from("horarios_extras")
    .insert({
      barbearia_id: barbearia.id,
      profissional_id: txt(d, "profissional_id"),
      inicio: localParaDate(dia, hi, barbearia.fuso).toISOString(),
      fim: localParaDate(dia, hf, barbearia.fuso).toISOString(),
    })
    .select("id");
  if (error) return falha(error);
  revalidatePath("/painel", "layout");
  return semEfeito(data) ?? { ok: "Horário extra aberto para agendamento." };
}

export async function removerExtra(d: FormData) {
  const { supabase } = await exigirBarbearia();
  await supabase.from("horarios_extras").delete().eq("id", txt(d, "id"));
  revalidatePath("/painel", "layout");
}

export async function salvarProfissional(_: ResultadoAcao, d: FormData): Promise<ResultadoAcao> {
  const { supabase, barbearia } = await exigirBarbearia();
  const id = txt(d, "id");
  const nome = txt(d, "nome");
  if (!nome) return { erro: "Informe o nome." };
  const q = id
    ? supabase.from("profissionais").update({ nome, ativo: d.get("ativo") === "on" }).eq("id", id).select("id")
    : supabase.from("profissionais").insert({ barbearia_id: barbearia.id, nome }).select("id");
  const { data, error } = await q;
  if (error) return falha(error);
  revalidatePath("/painel", "layout");
  return semEfeito(data) ?? { ok: id ? "Profissional atualizado." : "Profissional adicionado. Agora defina os horários dele." };
}

// ---------------------------------------------------------------- agendamentos

export async function novoAgendamento(_: ResultadoAcao, d: FormData): Promise<ResultadoAcao> {
  const { supabase, barbearia } = await exigirBarbearia();
  const dia = txt(d, "data");
  const h = txt(d, "hora");
  const servicos = d.getAll("servicos").map(String).filter(Boolean);
  if (!dataValida(dia) || !horaValida(h)) return { erro: "Informe o dia e a hora." };
  if (!servicos.length) return { erro: "Marque pelo menos um serviço." };

  let cliente = txt(d, "cliente_id") || null;
  const nome = txt(d, "nome");
  const tel = soDigitos(txt(d, "telefone"));
  // Mesmo telefone = mesmo cliente (evita cadastro duplicado)
  if (!cliente && tel.length >= 10) {
    const { data: achado } = await supabase
      .from("clientes")
      .select("id")
      .eq("barbearia_id", barbearia.id)
      .in("telefone", [tel, `55${tel}`, tel.replace(/^55/, "")])
      .limit(1)
      .maybeSingle();
    cliente = achado?.id ?? null;
  }
  if (!cliente && !nome) return { erro: "Informe o nome do cliente." };

  const { error } = await supabase.rpc("agendar_pelo_painel", {
    p_barbearia: barbearia.id,
    p_profissional: txt(d, "profissional_id"),
    p_inicio: localParaDate(dia, h, barbearia.fuso).toISOString(),
    p_servicos: servicos,
    p_cliente: cliente,
    p_nome: nome,
    p_telefone: tel,
    p_observacoes: txt(d, "observacoes"),
  });
  if (error) return falha(error);
  revalidatePath("/painel", "layout");
  return { ok: "Agendamento criado. Use o botão do WhatsApp no horário para mandar a confirmação ao cliente." };
}

const STATUS_OK = ["agendado", "confirmado", "cancelado", "faltou"];

export async function mudarStatus(d: FormData) {
  const { supabase } = await exigirBarbearia();
  const status = txt(d, "status");
  if (!STATUS_OK.includes(status)) return;
  await supabase
    .from("agendamentos")
    .update({
      status,
      cancelado_por: status === "cancelado" ? "barbearia" : null,
      ...(status === "agendado" ? { forma_pagamento: null } : {}),
    })
    .eq("id", txt(d, "id"));
  revalidatePath("/painel", "layout");
}

export async function excluirAgendamento(d: FormData) {
  const { supabase } = await exigirBarbearia();
  await supabase.from("agendamentos").delete().eq("id", txt(d, "id"));
  revalidatePath("/painel", "layout");
}

export async function marcarLembrete(id: string) {
  const { supabase } = await exigirBarbearia();
  await supabase.from("agendamentos").update({ lembrete_enviado_em: new Date().toISOString() }).eq("id", id);
  revalidatePath("/painel", "layout");
}

const FORMAS = ["pix", "dinheiro", "debito", "credito", "outro"];

/** Fechamento: preço cobrado de cada serviço, serviço extra e forma de pagamento. */
export async function fecharAtendimento(_: ResultadoAcao, d: FormData): Promise<ResultadoAcao> {
  const { supabase, barbearia } = await exigirBarbearia();
  const id = txt(d, "id");
  const forma = txt(d, "forma_pagamento");
  if (!FORMAS.includes(forma)) return { erro: "Escolha a forma de pagamento." };

  const itens = d.getAll("item_id").map(String);
  for (const itemId of itens) {
    const preco = numero(d, `preco_${itemId}`);
    if (!(preco >= 0)) return { erro: "Algum preço está inválido." };
    const { error } = await supabase
      .from("agendamento_itens")
      .update({ preco_cobrado: preco, promocao: d.get(`promo_${itemId}`) === "on" })
      .eq("id", itemId)
      .eq("agendamento_id", id);
    if (error) return falha(error);
  }

  const extra = txt(d, "servico_extra");
  if (extra) {
    const { data: s } = await supabase.from("servicos").select("id, nome, categoria, preco").eq("id", extra).maybeSingle();
    if (s) {
      const { error } = await supabase.from("agendamento_itens").insert({
        agendamento_id: id,
        barbearia_id: barbearia.id,
        servico_id: s.id,
        nome: s.nome,
        categoria: s.categoria,
        preco_tabela: s.preco,
        preco_cobrado: s.preco,
      });
      if (error) return falha(error);
    }
  }

  const { data, error } = await supabase
    .from("agendamentos")
    .update({ status: "concluido", forma_pagamento: forma, pagamento_obs: opcional(d, "pagamento_obs") })
    .eq("id", id)
    .select("id");
  if (error) {
    if (/exclusion|sobreposicao/i.test(error.message)) return { erro: "Há outro atendimento no mesmo horário. Cancele um deles antes." };
    return falha(error);
  }
  revalidatePath("/painel", "layout");
  return semEfeito(data) ?? { ok: "Atendimento fechado." };
}

// ---------------------------------------------------------------- clientes

export async function salvarCliente(_: ResultadoAcao, d: FormData): Promise<ResultadoAcao> {
  const { supabase, barbearia } = await exigirBarbearia();
  const id = txt(d, "id");
  const tel = soDigitos(txt(d, "telefone"));
  const dados = {
    nome: txt(d, "nome"),
    telefone: tel || null,
    observacoes: opcional(d, "observacoes"),
  };
  if (!dados.nome) return { erro: "Informe o nome." };
  const q = id
    ? supabase.from("clientes").update(dados).eq("id", id).select("id")
    : supabase.from("clientes").insert({ ...dados, barbearia_id: barbearia.id }).select("id");
  const { data, error } = await q;
  if (error) return falha(error);
  revalidatePath("/painel/clientes", "layout");
  return semEfeito(data) ?? { ok: id ? "Cliente atualizado." : "Cliente cadastrado." };
}
