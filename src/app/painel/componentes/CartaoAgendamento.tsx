import Link from "next/link";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { FormularioAcao } from "@/components/FormularioAcao";
import { SeloStatus } from "@/components/SeloStatus";
import { hora, moeda, PAGAMENTOS, quando } from "@/lib/formatar";
import { linkConfirmacao } from "@/lib/site";
import type { AgendamentoCompleto, Barbearia, Servico } from "@/lib/tipos";
import { linkWhats, mensagemAgendado, mensagemLembrete, telefoneBonito } from "@/lib/whatsapp";
import { excluirAgendamento, fecharAtendimento, mudarStatus } from "../acoes";
import { BotaoWhats } from "./BotaoWhats";

const BORDA: Record<string, string> = {
  agendado: "border-l-[var(--amarelo-texto)]",
  confirmado: "border-l-[var(--verde-texto)]",
  concluido: "border-l-[var(--azul-texto)]",
  faltou: "border-l-[var(--vermelho-texto)]",
  cancelado: "border-l-[var(--cinza-texto)] opacity-70",
};

function BotaoStatus({ id, status, rotulo, perigo }: { id: string; status: string; rotulo: string; perigo?: boolean }) {
  return (
    <form action={mudarStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className={`${perigo ? "btn-perigo" : "btn"} btn-pequeno`}>{rotulo}</button>
    </form>
  );
}

export function CartaoAgendamento({
  a,
  barbearia,
  servicos,
  mostrarProfissional,
  mostrarData = false,
}: {
  a: AgendamentoCompleto;
  barbearia: Barbearia;
  servicos: Servico[];
  mostrarProfissional: boolean;
  mostrarData?: boolean;
}) {
  const nome = a.clientes?.nome ?? "Cliente";
  const nomesServicos = a.agendamento_itens.map((i) => i.nome);
  const total = a.agendamento_itens.reduce((t, i) => t + Number(i.preco_cobrado), 0);
  const msg = {
    cliente: nome,
    barbearia: barbearia.nome,
    quando: quando(a.inicio, barbearia.fuso),
    servicos: nomesServicos,
    linkConfirmacao: linkConfirmacao(a.token_confirmacao),
  };
  const ativo = a.status === "agendado" || a.status === "confirmado";
  const lembrete = ativo ? linkWhats(a.clientes?.telefone, mensagemLembrete(msg)) : null;
  const avisoMarcado = ativo ? linkWhats(a.clientes?.telefone, mensagemAgendado(msg)) : null;
  const falar = linkWhats(a.clientes?.telefone);

  return (
    <li className={`cartao border-l-4 ${BORDA[a.status]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold">
            {mostrarData ? quando(a.inicio, barbearia.fuso) : `${hora(a.inicio, barbearia.fuso)}–${hora(a.fim, barbearia.fuso)}`}
          </p>
          <p className="font-medium">
            {a.clientes ? <Link href={`/painel/clientes/${a.clientes.id}`} className="hover:underline">{nome}</Link> : nome}
            {a.clientes?.telefone && <span className="ml-2 text-sm font-normal text-suave">{telefoneBonito(a.clientes.telefone)}</span>}
          </p>
          <p className="text-sm text-suave">
            {nomesServicos.join(" + ")} · {moeda(total)}
            {mostrarProfissional && a.profissionais ? ` · ${a.profissionais.nome}` : ""}
          </p>
          {a.observacoes && <p className="mt-1 text-sm">“{a.observacoes}”</p>}
        </div>
        <div className="flex flex-col items-end gap-1">
          <SeloStatus status={a.status} />
          {a.status === "agendado" && a.lembrete_enviado_em && <span className="text-xs text-suave">lembrete enviado, sem resposta</span>}
          {a.status === "concluido" && a.forma_pagamento && <span className="text-xs text-suave">{PAGAMENTOS[a.forma_pagamento]}</span>}
          {a.status === "cancelado" && a.cancelado_por && (
            <span className="text-xs text-suave">pelo {a.cancelado_por === "cliente" ? "cliente" : "barbeiro"}</span>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {lembrete && (
          <BotaoWhats href={lembrete} agendamentoId={a.id} rotulo={a.lembrete_enviado_em ? "Reenviar lembrete" : "Enviar lembrete"} destaque={!a.lembrete_enviado_em && a.status === "agendado"} />
        )}
        {avisoMarcado && a.origem === "painel" && (
          <BotaoWhats href={avisoMarcado} agendamentoId={a.id} rotulo="Avisar que marcou" marcar={false} />
        )}
        {!ativo && falar && (
          <a href={falar} target="_blank" rel="noopener noreferrer" className="btn btn-pequeno">WhatsApp</a>
        )}
        {a.status === "agendado" && <BotaoStatus id={a.id} status="confirmado" rotulo="Marcar confirmado" />}
        {ativo && <BotaoStatus id={a.id} status="faltou" rotulo="Faltou" />}
        {ativo && <BotaoStatus id={a.id} status="cancelado" rotulo="Cancelar (libera horário)" perigo />}
        {(a.status === "faltou" || a.status === "concluido") && <BotaoStatus id={a.id} status="agendado" rotulo="Desfazer" />}
        {a.status === "cancelado" && (
          <form action={excluirAgendamento}>
            <input type="hidden" name="id" value={a.id} />
            <button className="btn-perigo btn-pequeno">Apagar</button>
          </form>
        )}
      </div>

      {(ativo || a.status === "concluido") && (
        <details className="mt-3 rounded-lg border border-borda p-3" open={false}>
          <summary className="cursor-pointer text-sm font-semibold">
            {a.status === "concluido" ? "Editar fechamento" : "Fechar atendimento (pagamento)"}
          </summary>
          <FormularioAcao acao={fecharAtendimento} className="mt-3 space-y-3">
            <input type="hidden" name="id" value={a.id} />
            <ul className="space-y-2">
              {a.agendamento_itens.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="item_id" value={i.id} />
                  <span className="min-w-32 flex-1 text-sm">
                    {i.nome}
                    <span className="block text-xs text-suave">tabela {moeda(i.preco_tabela)}</span>
                  </span>
                  <label className="sr-only" htmlFor={`preco_${i.id}`}>Valor cobrado de {i.nome}</label>
                  <input
                    id={`preco_${i.id}`}
                    name={`preco_${i.id}`}
                    inputMode="decimal"
                    defaultValue={Number(i.preco_cobrado).toFixed(2)}
                    className="campo w-28"
                  />
                  <label className="flex items-center gap-1 text-xs">
                    <input type="checkbox" name={`promo_${i.id}`} defaultChecked={i.promocao} /> promoção
                  </label>
                </li>
              ))}
            </ul>
            <div>
              <label className="rotulo" htmlFor={`extra_${a.id}`}>Fez mais algum serviço?</label>
              <select id={`extra_${a.id}`} name="servico_extra" className="campo" defaultValue="">
                <option value="">Não</option>
                {servicos.filter((s) => s.ativo).map((s) => (
                  <option key={s.id} value={s.id}>{s.nome} ({moeda(s.preco)})</option>
                ))}
              </select>
            </div>
            <fieldset>
              <legend className="rotulo">Forma de pagamento</legend>
              <div className="flex flex-wrap gap-2">
                {(["pix", "dinheiro", "debito", "credito", "outro"] as const).map((f) => (
                  <label key={f} className="flex items-center gap-1 rounded-lg border border-borda px-3 py-2 text-sm">
                    <input type="radio" name="forma_pagamento" value={f} defaultChecked={a.forma_pagamento === f} required /> {PAGAMENTOS[f]}
                  </label>
                ))}
              </div>
            </fieldset>
            <input name="pagamento_obs" defaultValue={a.pagamento_obs ?? ""} placeholder="Observação do pagamento (opcional)" className="campo" />
            <BotaoEnviar>Salvar fechamento</BotaoEnviar>
          </FormularioAcao>
        </details>
      )}
    </li>
  );
}
