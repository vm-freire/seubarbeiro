import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho } from "@/components/Cabecalho";
import { FormCadastro } from "./FormCadastro";

export const metadata: Metadata = { title: "Criar conta" };

export default async function Page({ searchParams }: PageProps<"/cadastro">) {
  const { proximo, tipo } = await searchParams;
  const barbeiro = tipo === "barbeiro";
  const prox = typeof proximo === "string" ? proximo : "";
  const proximoQs = (t: "cliente" | "barbeiro") => {
    const q = new URLSearchParams();
    if (t === "barbeiro") q.set("tipo", "barbeiro");
    if (prox) q.set("proximo", prox);
    return q.size ? `?${q}` : "";
  };
  return (
    <>
      <Cabecalho />
      <main className="mx-auto w-full max-w-sm flex-1 px-4 py-10">
        <h1 className="titulo mb-1">{barbeiro ? "Conta de barbeiro" : "Conta de cliente"}</h1>
        <p className="mb-4 text-sm text-suave">
          {barbeiro
            ? "Para o dono cadastrar a barbearia ou para o barbeiro que recebeu convite da equipe."
            : "Para marcar horários. Leva menos de um minuto; nas próximas vezes é só e-mail e senha."}
        </p>
        <nav className="mb-6 grid grid-cols-2 gap-1 rounded-full border border-borda bg-superficie-2 p-1 text-sm font-semibold" aria-label="Tipo de conta">
          <Link
            href={`/cadastro${proximoQs("cliente")}`}
            aria-current={!barbeiro ? "page" : undefined}
            className={`rounded-full px-3 py-2 text-center ${!barbeiro ? "bg-texto text-fundo" : "text-suave hover:text-texto"}`}
          >
            Sou cliente
          </Link>
          <Link
            href={`/cadastro${proximoQs("barbeiro")}`}
            aria-current={barbeiro ? "page" : undefined}
            className={`rounded-full px-3 py-2 text-center ${barbeiro ? "bg-texto text-fundo" : "text-suave hover:text-texto"}`}
          >
            Sou barbeiro
          </Link>
        </nav>
        <p className="ajuda -mt-3 mb-6">Conta de cliente e conta de barbeiro são separadas. Quem trabalha e também corta o cabelo usa dois e-mails.</p>
        <FormCadastro proximo={typeof proximo === "string" ? proximo : undefined} barbeiro={barbeiro} />
      </main>
    </>
  );
}
