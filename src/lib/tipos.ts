import type { Categoria, Pagamento, Status } from "./formatar.ts";

export type Barbearia = {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  sobre: string | null;
  endereco: string | null;
  cidade: string | null;
  maps_url: string | null;
  whatsapp: string | null;
  instagram: string | null;
  fuso: string;
  passo_minutos: number;
  antecedencia_minima_min: number;
  dias_agenda_aberta: number;
  agenda_aberta_ate: string | null;
  lembrete_minutos: number;
  plano: string;
  assinatura_status: "teste" | "ativa" | "atrasada" | "suspensa" | "cancelada";
  assinatura_valida_ate: string | null;
  capa_url: string | null;
  logo_url: string | null;
};

export type Titulo = "Barbeiro" | "Barbeira";

export type Profissional = {
  id: string;
  barbearia_id: string;
  nome: string;
  ativo: boolean;
  ordem: number;
  user_id: string | null;
  foto_url: string | null;
  titulo: Titulo;
  bio: string | null;
};

export type Servico = {
  id: string;
  barbearia_id: string;
  nome: string;
  descricao: string | null;
  categoria: Categoria;
  preco: string;
  duracao_min: number;
  ativo: boolean;
  ordem: number;
};

export type Promocao = {
  id: string;
  barbearia_id: string;
  servico_id: string;
  nome: string;
  preco: string;
  dias_semana: number[] | null;
  data_inicio: string | null;
  data_fim: string | null;
  ativa: boolean;
};

export type HorarioSemana = {
  id: string;
  profissional_id: string;
  dia_semana: number;
  inicio: string; // "09:00:00"
  fim: string;
};

export type Bloqueio = {
  id: string;
  profissional_id: string | null;
  inicio: string;
  fim: string;
  motivo: string | null;
};

export type HorarioExtra = { id: string; profissional_id: string; inicio: string; fim: string };

export type Cliente = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  observacoes: string | null;
  user_id: string | null;
  criado_em: string;
};

export type Item = {
  id: string;
  agendamento_id: string;
  servico_id: string | null;
  nome: string;
  categoria: Categoria;
  preco_tabela: string;
  preco_cobrado: string;
  promocao: boolean;
  promocao_nome: string | null;
};

export type Agendamento = {
  id: string;
  barbearia_id: string;
  profissional_id: string;
  cliente_id: string;
  inicio: string;
  fim: string;
  status: Status;
  origem: "site" | "painel" | "whatsapp";
  token_confirmacao: string;
  respondido_em: string | null;
  lembrete_enviado_em: string | null;
  cancelado_por: "cliente" | "barbearia" | null;
  forma_pagamento: Exclude<Pagamento, "nao_informado"> | null;
  pagamento_obs: string | null;
  observacoes: string | null;
  criado_em: string;
};

/** Conta de cliente (agenda) ou de profissional (painel). Migração 005. */
export type TipoConta = "cliente" | "profissional";

/** Foto de corte/trabalho da galeria (migração 004). */
export type Trabalho = {
  id: string;
  barbearia_id: string;
  profissional_id: string | null;
  url: string;
  caminho: string;
  legenda: string | null;
  criado_em: string;
};

/** Serviço que um profissional não faz (o dono marca em Equipe). */
export type NaoFaz = { profissional_id: string; servico_id: string };

export type AgendamentoCompleto = Agendamento & {
  clientes: Pick<Cliente, "id" | "nome" | "telefone"> | null;
  profissionais: Pick<Profissional, "id" | "nome" | "foto_url"> | null;
  agendamento_itens: Item[];
};

export type ResultadoAcao = { erro?: string; ok?: string } | null;
