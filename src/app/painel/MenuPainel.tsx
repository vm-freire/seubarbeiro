"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// [endereço, rótulo, só para o dono?]
const itens = [
  ["/painel", "Hoje", false],
  ["/painel/agenda", "Agenda", false],
  ["/painel/clientes", "Clientes", false],
  ["/painel/horarios", "Horários e folgas", false],
  ["/painel/relatorios", "Relatórios", false],
  ["/painel/galeria", "Galeria", false],
  ["/painel/equipe", "Equipe", true],
  ["/painel/servicos", "Serviços e preços", true],
  ["/painel/configuracoes", "Barbearia", true],
  ["/painel/assinatura", "Assinatura", true],
  ["/painel/perfil", "Meu perfil", false],
] as const;

export function MenuPainel({ dono }: { dono: boolean }) {
  const caminho = usePathname();
  return (
    <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2" aria-label="Painel">
      {itens
        .filter(([, , soDono]) => dono || !soDono)
        .map(([href, rotulo]) => {
          const ativo = href === "/painel" ? caminho === href : caminho.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={ativo ? "page" : undefined}
              className={`relative rounded-full px-3.5 py-2 text-sm font-semibold whitespace-nowrap transition ${ativo ? "bg-texto text-fundo" : "text-suave hover:bg-superficie-2 hover:text-texto"}`}
            >
              {rotulo}
            </Link>
          );
        })}
    </nav>
  );
}
