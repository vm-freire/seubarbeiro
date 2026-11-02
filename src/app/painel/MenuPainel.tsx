"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const itens = [
  ["/painel", "Hoje"],
  ["/painel/agenda", "Agenda"],
  ["/painel/clientes", "Clientes"],
  ["/painel/servicos", "Serviços e preços"],
  ["/painel/horarios", "Horários e folgas"],
  ["/painel/relatorios", "Relatórios"],
  ["/painel/configuracoes", "Configurações"],
] as const;

export function MenuPainel() {
  const caminho = usePathname();
  return (
    <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2" aria-label="Painel">
      {itens.map(([href, rotulo]) => {
        const ativo = href === "/painel" ? caminho === href : caminho.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={ativo ? "page" : undefined}
            className={`rounded-lg px-3 py-2 text-sm whitespace-nowrap ${ativo ? "bg-superficie-2 font-semibold" : "text-suave hover:bg-superficie-2"}`}
          >
            {rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
