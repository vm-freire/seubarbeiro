import Link from "next/link";
import { LogoMarca } from "./Logo";

export function Rodape() {
  return (
    <footer className="nao-imprimir mt-auto border-t border-borda">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-suave">
        <Link href="/" className="flex items-center gap-2 hover:text-texto">
          <LogoMarca tamanho={22} />
          <span className="font-titulo font-extrabold tracking-wide uppercase">Seu Barbeiro</span>
        </Link>
        <span>Agendamento online para barbearias</span>
      </div>
    </footer>
  );
}
