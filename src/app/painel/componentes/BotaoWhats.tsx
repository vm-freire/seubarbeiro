"use client";

import { marcarLembrete } from "../acoes";

/**
 * Abre o WhatsApp com a mensagem pronta (modo gratuito: o barbeiro só
 * toca em enviar). Marca o lembrete como enviado no agendamento.
 */
export function BotaoWhats({
  href,
  agendamentoId,
  rotulo,
  marcar = true,
  destaque = false,
}: {
  href: string;
  agendamentoId: string;
  rotulo: string;
  marcar?: boolean;
  destaque?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${destaque ? "btn-primario" : "btn"} btn-pequeno`}
      onClick={() => {
        if (marcar) void marcarLembrete(agendamentoId);
      }}
    >
      {rotulo}
    </a>
  );
}
