/**
 * E-mail "Criar senha nova", em português, enviado pelo próprio site (Resend).
 * Assim não depende do envio de e-mail do Supabase (que é limitado).
 * Só o texto aqui: quem gera o link e envia é a ação pedirRecuperacao.
 */

const escapar = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function emailRecuperacao(link: string) {
  const l = escapar(link);
  const assunto = "Criar senha nova · Seu Barbeiro";
  const texto = [
    "Recebemos um pedido para criar uma senha nova na sua conta do Seu Barbeiro.",
    "",
    `Para criar a senha nova, abra este link: ${link}`,
    "",
    "O link vale por 1 hora e só funciona uma vez.",
    "Se não foi você, ignore este e-mail: sua senha continua a mesma.",
  ].join("\n");
  const html = `<!doctype html>
<html lang="pt-BR"><body style="margin:0;background:#f3ede2;font-family:Arial,Helvetica,sans-serif;color:#1c1917">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3ede2;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden">
        <tr><td style="background:#0f0d0c;padding:18px 24px;color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:1px">SEU BARBEIRO</td></tr>
        <tr><td style="height:6px;background:repeating-linear-gradient(135deg,#d7263d 0 10px,#ffffff 10px 20px)"></td></tr>
        <tr><td style="padding:28px 24px">
          <h1 style="margin:0 0 12px;font-size:22px">Criar senha nova</h1>
          <p style="margin:0 0 20px;font-size:16px;line-height:1.5">Recebemos um pedido para criar uma senha nova na sua conta do Seu Barbeiro.</p>
          <p style="margin:0 0 24px"><a href="${l}" style="display:inline-block;background:#d7263d;color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;padding:14px 24px;border-radius:999px">Criar senha nova</a></p>
          <p style="margin:0 0 8px;font-size:14px;color:#57534e;line-height:1.5">O link vale por 1 hora e só funciona uma vez.</p>
          <p style="margin:0 0 20px;font-size:14px;color:#57534e;line-height:1.5">Se não foi você, ignore este e-mail: sua senha continua a mesma.</p>
          <p style="margin:0;font-size:12px;color:#78716c;line-height:1.5;word-break:break-all">O botão não abriu? Copie e cole no navegador:<br>${l}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  return { assunto, texto, html };
}
