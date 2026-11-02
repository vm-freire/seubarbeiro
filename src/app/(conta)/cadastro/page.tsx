import type { Metadata } from "next";
import { Cabecalho } from "@/components/Cabecalho";
import { FormCadastro } from "./FormCadastro";

export const metadata: Metadata = { title: "Criar conta" };

export default async function Page({ searchParams }: PageProps<"/cadastro">) {
  const { proximo, tipo } = await searchParams;
  const barbeiro = tipo === "barbeiro";
  return (
    <>
      <Cabecalho />
      <main className="mx-auto w-full max-w-sm flex-1 px-4 py-10">
        <h1 className="titulo mb-1">{barbeiro ? "Cadastre sua barbearia" : "Criar conta"}</h1>
        <p className="mb-6 text-sm text-suave">
          {barbeiro
            ? "Primeiro, a sua conta. Depois você dá nome e link à barbearia."
            : "Leva menos de um minuto. Nas próximas vezes é só e-mail e senha."}
        </p>
        <FormCadastro proximo={typeof proximo === "string" ? proximo : undefined} barbeiro={barbeiro} />
      </main>
    </>
  );
}
