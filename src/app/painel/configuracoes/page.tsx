import { BotaoEnviar } from "@/components/BotaoEnviar";
import { CopiarTexto } from "@/components/CopiarTexto";
import { FormularioAcao } from "@/components/FormularioAcao";
import { ROTULO_ASSINATURA } from "@/lib/assinatura";
import { dataCurta } from "@/lib/formatar";
import { exigirBarbearia } from "@/lib/painel";
import { linkAgendamento } from "@/lib/site";
import { mensagemAusencia, mensagemSaudacao, telefoneBonito } from "@/lib/whatsapp";
import { salvarConfiguracoes } from "../acoes";

export const metadata = { title: "Configurações" };

function Campo({ id, rotulo, ajuda, ...resto }: React.InputHTMLAttributes<HTMLInputElement> & { id: string; rotulo: string; ajuda?: string }) {
  return (
    <div>
      <label className="rotulo" htmlFor={id}>{rotulo}</label>
      <input id={id} name={id} className="campo" {...resto} />
      {ajuda && <p className="ajuda">{ajuda}</p>}
    </div>
  );
}

export default async function Page() {
  const { barbearia: b } = await exigirBarbearia();
  const link = linkAgendamento(b.slug);
  const saudacao = mensagemSaudacao({ barbearia: b.nome, linkAgendamento: link });
  const ausencia = mensagemAusencia({ barbearia: b.nome, linkAgendamento: link });

  return (
    <div className="space-y-8">
      <h1 className="titulo">Configurações</h1>

      <section className="cartao">
        <h2 className="subtitulo mb-1">WhatsApp: resposta automática com o link</h2>
        <p className="mb-3 text-sm text-suave">
          No modo gratuito, a resposta automática é feita pelo próprio <strong>WhatsApp Business</strong> (app grátis). Faça uma vez só:
        </p>
        <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm">
          <li>Instale o <strong>WhatsApp Business</strong> no número da barbearia (dá para migrar o número que você já usa).</li>
          <li>Abra <strong>Configurações → Ferramentas comerciais → Mensagem de saudação</strong>, ative e cole o texto 1.</li>
          <li>Em <strong>Mensagem de ausência</strong>, ative, escolha “Fora do horário comercial” ou “Programação personalizada” e cole o texto 2.</li>
          <li>Pronto: quem mandar mensagem recebe o link para agendar sozinho.</li>
        </ol>
        <div className="grid gap-4 lg:grid-cols-2">
          {[
            ["1. Mensagem de saudação", saudacao],
            ["2. Mensagem de ausência (quando estiver atendendo)", ausencia],
          ].map(([t, texto]) => (
            <div key={t}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{t}</h3>
                <CopiarTexto texto={texto} />
              </div>
              <pre className="rounded-lg bg-superficie-2 p-3 text-xs whitespace-pre-wrap">{texto}</pre>
            </div>
          ))}
        </div>
        <p className="ajuda mt-3">
          Os lembretes antes do horário aparecem na tela “Hoje”: um toque abre o WhatsApp com a mensagem pronta e o link “Vou / Não vou”.
        </p>
      </section>

      <section className="cartao">
        <h2 className="subtitulo mb-3">Dados da barbearia</h2>
        <FormularioAcao acao={salvarConfiguracoes} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id="nome" rotulo="Nome" defaultValue={b.nome} required maxLength={80} />
            <Campo id="slug" rotulo="Link (/b/...)" defaultValue={b.slug} required pattern="[a-z0-9]+(-[a-z0-9]+)*" ajuda="Se mudar, o link antigo para de funcionar." />
            <Campo id="whatsapp" rotulo="WhatsApp da barbearia" type="tel" defaultValue={telefoneBonito(b.whatsapp)} placeholder="(41) 99999-8888" />
            <Campo id="instagram" rotulo="Instagram" defaultValue={b.instagram ?? ""} placeholder="@suabarbearia" />
            <Campo id="endereco" rotulo="Endereço" defaultValue={b.endereco ?? ""} placeholder="Rua, número, bairro" />
            <Campo id="cidade" rotulo="Cidade" defaultValue={b.cidade ?? ""} placeholder="Curitiba - PR" />
          </div>
          <Campo
            id="maps_url"
            rotulo="Link do Google Maps (opcional)"
            defaultValue={b.maps_url ?? ""}
            placeholder="https://maps.app.goo.gl/..."
            ajuda="No Google Maps, ache a barbearia → Compartilhar → Copiar link. Sem o link, usamos o endereço acima para traçar a rota."
          />
          <div>
            <label className="rotulo" htmlFor="descricao">Descrição curta</label>
            <textarea id="descricao" name="descricao" defaultValue={b.descricao ?? ""} maxLength={300} rows={2} className="campo py-2" />
          </div>

          <h3 className="pt-2 font-semibold">Agenda</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="rotulo" htmlFor="passo">Intervalo entre horários</label>
              <select id="passo" name="passo_minutos" defaultValue={b.passo_minutos} className="campo">
                {[10, 15, 20, 30, 45, 60].map((m) => (
                  <option key={m} value={m}>de {m} em {m} min</option>
                ))}
              </select>
            </div>
            <Campo
              id="antecedencia_minima_min"
              rotulo="Antecedência mínima (min)"
              type="number"
              min={0}
              max={2880}
              defaultValue={b.antecedencia_minima_min}
              ajuda="Ex.: 60 = o cliente não marca para daqui a menos de 1 hora."
            />
            <Campo
              id="lembrete_minutos"
              rotulo="Lembrete antes do horário (min)"
              type="number"
              min={10}
              max={1440}
              defaultValue={b.lembrete_minutos}
              ajuda="Quando o lembrete aparece em “Hoje”."
            />
          </div>
          <BotaoEnviar>Salvar configurações</BotaoEnviar>
        </FormularioAcao>
      </section>

      <section className="cartao">
        <h2 className="subtitulo mb-1">Assinatura</h2>
        <p className="text-sm">
          {ROTULO_ASSINATURA[b.assinatura_status]}
          {b.assinatura_valida_ate ? ` · válida até ${dataCurta(b.assinatura_valida_ate)}` : ""}
        </p>
        <p className="ajuda">Durante os testes o uso é gratuito.</p>
      </section>
    </div>
  );
}
