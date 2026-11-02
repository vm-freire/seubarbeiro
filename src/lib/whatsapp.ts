/**
 * WhatsApp — modo GRATUITO (por enquanto).
 *
 * Sem a API paga, o site não manda mensagem sozinho. Então:
 *  - a barbearia cola a "mensagem de saudação" (com o link de agendamento)
 *    no WhatsApp Business dela (app gratuito: Ferramentas comerciais →
 *    Mensagem de saudação / Mensagem de ausência);
 *  - o painel monta os lembretes prontos e abre o WhatsApp com um toque
 *    (link wa.me). O cliente responde pelo link de confirmação.
 *
 * Quando for contratar a API oficial (Meta Cloud API), basta trocar o
 * "abrir wa.me" por um envio automático; os textos e o link de
 * confirmação continuam os mesmos.
 */

export function soDigitos(s: string | null | undefined) {
  return (s ?? "").replace(/\D/g, "");
}

/** Número no formato do WhatsApp (55 + DDD + número) ou null se não der. */
export function numeroWhats(tel: string | null | undefined): string | null {
  let n = soDigitos(tel);
  if (n.startsWith("0")) n = n.replace(/^0+/, "");
  if (n.length === 10 || n.length === 11) n = `55${n}`;
  if (n.length < 12 || n.length > 13) return null;
  return n;
}

export function linkWhats(tel: string | null | undefined, texto?: string) {
  const n = numeroWhats(tel);
  if (!n) return null;
  return `https://wa.me/${n}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}

export function telefoneBonito(tel: string | null | undefined) {
  let n = soDigitos(tel);
  if (n.startsWith("55") && n.length >= 12) n = n.slice(2);
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return tel ?? "";
}

export function mensagemLembrete(p: {
  cliente: string;
  barbearia: string;
  quando: string; // "hoje às 15:00"
  servicos: string[];
  linkConfirmacao: string;
}) {
  const nome = p.cliente.split(" ")[0];
  return [
    `Olá, ${nome}! Aqui é da ${p.barbearia}.`,
    `Seu horário é ${p.quando} (${p.servicos.join(" + ")}).`,
    ``,
    `Você vem? Toque no link e responda *Vou* ou *Não vou*:`,
    p.linkConfirmacao,
    ``,
    `Se não puder vir, avise pelo link que liberamos o horário pra outra pessoa. Obrigado!`,
  ].join("\n");
}

export function mensagemAgendado(p: {
  cliente: string;
  barbearia: string;
  quando: string;
  servicos: string[];
  linkConfirmacao: string;
}) {
  const nome = p.cliente.split(" ")[0];
  return [
    `Olá, ${nome}! Seu horário na ${p.barbearia} está marcado:`,
    `*${p.quando}* (${p.servicos.join(" + ")}).`,
    ``,
    `Para confirmar, cancelar ou ver a rota no mapa:`,
    p.linkConfirmacao,
  ].join("\n");
}

export function mensagemSaudacao(p: { barbearia: string; linkAgendamento: string }) {
  return [
    `Olá! Bem-vindo à ${p.barbearia}.`,
    ``,
    `Para *agendar seu horário*, é só tocar aqui e escolher o serviço, o dia e a hora:`,
    p.linkAgendamento,
    ``,
    `Lá você também vê os preços, as promoções e a rota até a barbearia.`,
    `Se quiser falar com o barbeiro, é só mandar sua mensagem aqui. Durante os atendimentos eu posso demorar um pouco para responder.`,
  ].join("\n");
}

export function mensagemAusencia(p: { barbearia: string; linkAgendamento: string }) {
  return [
    `Olá! No momento estou atendendo e não consigo responder.`,
    ``,
    `Para *agendar*, toque no link (funciona a qualquer hora):`,
    p.linkAgendamento,
    ``,
    `Assim que puder, eu respondo sua mensagem. — ${p.barbearia}`,
  ].join("\n");
}
