import { BotaoEnviar } from "@/components/BotaoEnviar";
import { CopiarTexto } from "@/components/CopiarTexto";
import { FormularioAcao } from "@/components/FormularioAcao";
import {
  asaasConfigurado,
  cobrancasDaAssinatura,
  EM_ABERTO,
  FORMAS,
  linhaDigitavel,
  PAGA,
  pixDaCobranca,
  type CobrancaAsaas,
  type FormaAsaas,
} from "@/lib/asaas";
import { assinaturaLiberada, diasAte, ehCortesia, rotuloAssinatura, VALOR_MENSAL } from "@/lib/assinatura";
import { dataCurta, moeda } from "@/lib/formatar";
import { exigirDono } from "@/lib/painel";
import { assinar, trocarForma } from "./acoes";
import { BotaoCancelar } from "./BotaoCancelar";

export const metadata = { title: "Assinatura" };

const ROTULO_COBRANCA: Record<string, [string, string]> = {
  PENDING: ["Em aberto", "selo-amarelo"],
  OVERDUE: ["Vencida", "selo-vermelho"],
  RECEIVED: ["Paga", "selo-verde"],
  CONFIRMED: ["Paga", "selo-verde"],
  RECEIVED_IN_CASH: ["Paga", "selo-verde"],
  REFUNDED: ["Estornada", "selo-cinza"],
};

function EscolherForma({ atual }: { atual?: FormaAsaas }) {
  return (
    <fieldset>
      <legend className="rotulo">Como você quer pagar?</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {(Object.keys(FORMAS) as FormaAsaas[]).map((f, i) => (
          <label
            key={f}
            className="flex cursor-pointer items-center gap-2 rounded-xl border border-borda p-3 font-semibold has-[:checked]:border-destaque has-[:checked]:bg-superficie-2"
          >
            <input type="radio" name="forma" value={f} defaultChecked={atual ? atual === f : i === 0} required className="accent-[var(--destaque)]" /> {FORMAS[f]}
          </label>
        ))}
      </div>
      <p className="ajuda">Pix e boleto: a cobrança chega todo mês. Cartão: depois do 1º pagamento, é debitado sozinho.</p>
    </fieldset>
  );
}

/** Como pagar a cobrança em aberto: QR do Pix, boleto ou link do cartão. */
async function PagarCobranca({ c }: { c: CobrancaAsaas }) {
  const [pix, linha] = await Promise.all([
    c.billingType === "PIX" ? pixDaCobranca(c.id).catch(() => null) : null,
    c.billingType === "BOLETO" ? linhaDigitavel(c.id).catch(() => null) : null,
  ]);
  return (
    <div className="space-y-3">
      <p>
        <strong>{moeda(c.value)}</strong> · vence em {dataCurta(c.dueDate)}{" "}
        <span className={`selo ${ROTULO_COBRANCA[c.status]?.[1] ?? "selo-cinza"}`}>{ROTULO_COBRANCA[c.status]?.[0] ?? c.status}</span>
      </p>
      {pix && (
        <div className="flex flex-col items-start gap-3 sm:flex-row">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`data:image/png;base64,${pix.encodedImage}`} alt="QR Code do Pix" width={180} height={180} className="rounded-lg bg-white p-2" />
          <div className="min-w-0 space-y-2">
            <p className="text-sm">Abra o app do banco, escolha Pix e leia o QR Code, ou use o copia e cola:</p>
            <p className="rounded-lg bg-superficie-2 p-2 font-mono text-xs break-all">{pix.payload}</p>
            <CopiarTexto texto={pix.payload} rotulo="Copiar código Pix" />
          </div>
        </div>
      )}
      {linha && (
        <div className="space-y-2">
          <p className="text-sm">Linha digitável do boleto:</p>
          <p className="rounded-lg bg-superficie-2 p-2 font-mono text-xs break-all">{linha.identificationField}</p>
          <div className="flex flex-wrap gap-2">
            <CopiarTexto texto={linha.identificationField} rotulo="Copiar linha digitável" />
            {c.bankSlipUrl && (
              <a href={c.bankSlipUrl} target="_blank" rel="noopener noreferrer" className="btn btn-pequeno">Abrir boleto (PDF)</a>
            )}
          </div>
        </div>
      )}
      <a href={c.invoiceUrl} target="_blank" rel="noopener noreferrer" className={c.billingType === "CREDIT_CARD" ? "btn-primario" : "btn btn-pequeno"}>
        {c.billingType === "CREDIT_CARD" ? "Pagar com cartão" : "Abrir fatura no Asaas"}
      </a>
      <p className="ajuda">O pagamento é feito na página segura do Asaas. A confirmação aqui pode levar alguns minutos (boleto: até 3 dias úteis).</p>
    </div>
  );
}

export default async function Page() {
  const { barbearia: b, supabase, user } = await exigirDono();
  const cortesia = ehCortesia(b);
  const liberada = assinaturaLiberada(b);
  const { data: ass } = await supabase.from("assinaturas").select("*").eq("barbearia_id", b.id).maybeSingle();
  const ativa = ass?.situacao === "ativa" && ass.asaas_assinatura;

  let cobrancas: CobrancaAsaas[] = [];
  let erroCobrancas = false;
  if (ativa && asaasConfigurado()) {
    cobrancas = await cobrancasDaAssinatura(ass.asaas_assinatura).catch(() => {
      erroCobrancas = true;
      return [];
    });
  }
  // a mais antiga em aberto é a que precisa ser paga primeiro
  const emAberto = cobrancas.filter((c) => EM_ABERTO.has(c.status)).sort((x, y) => x.dueDate.localeCompare(y.dueDate))[0];
  const pagas = cobrancas.filter((c) => PAGA.has(c.status)).slice(0, 6);
  const dias = b.assinatura_valida_ate ? diasAte(b.assinatura_valida_ate) : null;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="titulo text-4xl">Assinatura</h1>
        <p className="text-sm text-suave">Seu Barbeiro · {moeda(VALOR_MENSAL)} por mês, sem fidelidade.</p>
      </div>

      <section className="cartao space-y-1">
        <p className="text-xs text-suave">Situação</p>
        <p className="text-2xl font-bold">{rotuloAssinatura(b)}</p>
        {cortesia ? (
          <p className="text-sm text-suave">Sua barbearia é das primeiras do Seu Barbeiro: o uso é gratuito, sem prazo.</p>
        ) : (
          b.assinatura_valida_ate && (
            <p className="text-sm text-suave">
              {b.assinatura_status === "teste" ? "Teste grátis até" : "Pago até"} {dataCurta(b.assinatura_valida_ate)}
              {dias !== null && dias >= 0 ? ` (${dias === 0 ? "hoje" : dias === 1 ? "amanhã" : `${dias} dias`})` : ""}
              {!liberada ? " · bloqueada até o pagamento" : ""}
            </p>
          )
        )}
        {!cortesia && !liberada && (
          <p className="aviso selo-vermelho mt-2 block">
            A agenda está bloqueada, mas nada foi apagado: serviços, equipe, clientes e histórico continuam guardados. Assim que o pagamento for confirmado, tudo volta.
          </p>
        )}
      </section>

      {cortesia ? null : !asaasConfigurado() ? (
        <p className="aviso selo-amarelo block">O pagamento online ainda está sendo ativado. Volte em breve.</p>
      ) : !ativa ? (
        <section className="cartao space-y-4">
          <div>
            <h2 className="subtitulo">Assinar</h2>
            <p className="text-sm text-suave">
              {b.assinatura_status === "teste" && dias !== null && dias > 0
                ? `Você não paga nada agora: a 1ª cobrança vence em ${dataCurta(b.assinatura_valida_ate!)}, no fim do teste.`
                : "A 1ª cobrança vence hoje. Assim que for paga, a agenda volta a funcionar."}
            </p>
          </div>
          <FormularioAcao acao={assinar} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="rotulo" htmlFor="nome">Nome completo ou razão social</label>
                <input id="nome" name="nome" required minLength={3} maxLength={100} className="campo" autoComplete="name" />
              </div>
              <div>
                <label className="rotulo" htmlFor="documento">CPF ou CNPJ</label>
                <input id="documento" name="documento" required inputMode="numeric" maxLength={18} className="campo" placeholder="Só números" />
              </div>
              <div className="sm:col-span-2">
                <label className="rotulo" htmlFor="email">E-mail para receber as cobranças</label>
                <input id="email" name="email" type="email" required defaultValue={user.email ?? ""} className="campo" autoComplete="email" />
              </div>
            </div>
            <EscolherForma />
            <BotaoEnviar className="btn-primario" pendente="Criando assinatura…">Assinar por {moeda(VALOR_MENSAL)}/mês</BotaoEnviar>
            <p className="ajuda">O CPF/CNPJ vai só para o Asaas (quem emite a cobrança); não fica salvo no Seu Barbeiro.</p>
          </FormularioAcao>
        </section>
      ) : (
        <>
          <section className="cartao space-y-3">
            <h2 className="subtitulo">{emAberto ? "Pagar agora" : "Próxima cobrança"}</h2>
            {erroCobrancas ? (
              <p className="aviso selo-amarelo block">Não conseguimos falar com o Asaas agora. Recarregue a página em instantes.</p>
            ) : emAberto ? (
              <PagarCobranca c={emAberto} />
            ) : (
              <p className="text-sm text-suave">Nenhuma cobrança em aberto. A próxima é gerada automaticamente antes do vencimento.</p>
            )}
          </section>

          <section className="cartao space-y-3">
            <h2 className="subtitulo">Forma de pagamento</h2>
            <FormularioAcao acao={trocarForma} className="space-y-3">
              <EscolherForma atual={ass.forma as FormaAsaas} />
              <BotaoEnviar className="btn btn-pequeno" pendente="Trocando…">Trocar forma de pagamento</BotaoEnviar>
            </FormularioAcao>
          </section>

          {pagas.length > 0 && (
            <section className="cartao">
              <h2 className="subtitulo mb-2">Pagamentos</h2>
              <ul className="divide-y divide-borda text-sm">
                {pagas.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                    <span>Vencimento {dataCurta(c.dueDate)} · {FORMAS[c.billingType as FormaAsaas] ?? c.billingType}</span>
                    <a href={c.invoiceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold tabular-nums underline">{moeda(c.value)}</a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="cartao">
            <BotaoCancelar />
          </section>
        </>
      )}
    </div>
  );
}
