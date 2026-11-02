/** Endereço público do site, usado nos links que vão pelo WhatsApp. */
export function urlSite() {
  const u = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return u.replace(/\/+$/, "");
}

export const linkAgendamento = (slug: string) => `${urlSite()}/b/${slug}`;
export const linkConfirmacao = (token: string) => `${urlSite()}/c/${token}`;

/**
 * Desiste se a resposta demorar demais: assim o botão nunca fica
 * "carregando" para sempre (já aconteceu no Safari do iPhone).
 */
export function comLimite<T>(p: PromiseLike<T>, ms = 20_000): Promise<T> {
  return new Promise((ok, falha) => {
    const t = setTimeout(() => falha(new Error("Tempo esgotado")), ms);
    Promise.resolve(p).then(
      (v) => {
        clearTimeout(t);
        ok(v);
      },
      (e) => {
        clearTimeout(t);
        falha(e);
      },
    );
  });
}

/** Mensagem de erro do Supabase em português simples. */
export function traduzirErro(e: { message?: string } | null | undefined, padrao = "Algo deu errado. Tente de novo.") {
  const m = e?.message ?? "";
  if (!m) return padrao;
  if (/Invalid login credentials/i.test(m)) return "E-mail ou senha incorretos.";
  if (/Email not confirmed/i.test(m)) return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  if (/User already registered|already been registered|email_exists/i.test(m)) return "Já existe uma conta com esse e-mail. Use a opção Entrar.";
  // o banco recusa WhatsApp repetido; o Supabase Auth troca a mensagem por esta
  if (/Database error saving new user/i.test(m)) return "Não deu para criar a conta: esse WhatsApp ou e-mail já está cadastrado. Use a opção Entrar.";
  if (/Password should be at least/i.test(m)) return "A senha precisa ter pelo menos 6 caracteres.";
  if (/rate limit/i.test(m)) return "Muitas tentativas seguidas. Espere um minuto e tente de novo.";
  // "Load failed" é como o Safari (iPhone) chama a falha de rede
  if (/Failed to fetch|NetworkError|Load failed|TypeError/i.test(m)) return "Sem conexão com o servidor. Confira sua internet (ou desligue bloqueadores de conteúdo) e tente de novo.";
  if (/Tempo esgotado/.test(m)) return "O servidor demorou demais para responder. Confira sua internet e tente de novo.";
  if (/row-level security|permission denied/i.test(m)) return "Você não tem permissão para isso (ou a assinatura está pausada).";
  // Mensagens que nós mesmos escrevemos no banco já vêm em português
  if (/[áéíóúãõçê]/i.test(m) || /^(Informe|Escolha|Entre|Esse|Este|Esta|Sem acesso|Nome ou link|A agenda|O agendamento|Assinatura)/.test(m)) return m;
  // mensagem desconhecida: mostra um pedaço do texto original para ajudar a achar o problema
  return `${padrao} (${m.slice(0, 80)})`;
}
