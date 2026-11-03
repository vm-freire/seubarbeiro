import type { Metadata } from "next";
import { Cabecalho } from "@/components/Cabecalho";
import { FormEsqueci } from "./FormEsqueci";

export const metadata: Metadata = { title: "Esqueci minha senha" };

export default function Page() {
  return (
    <>
      <Cabecalho />
      <main className="mx-auto w-full max-w-sm flex-1 px-4 py-10">
        <h1 className="titulo mb-2">Esqueci minha senha</h1>
        <p className="mb-6 text-sm text-suave">Informe o e-mail da sua conta. Enviamos um link para você criar uma senha nova.</p>
        <FormEsqueci />
      </main>
    </>
  );
}
