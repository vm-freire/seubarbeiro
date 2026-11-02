import type { Metadata } from "next";
import { Cabecalho } from "@/components/Cabecalho";
import { FormEntrar } from "./FormEntrar";

export const metadata: Metadata = { title: "Entrar" };

export default async function Page({ searchParams }: PageProps<"/entrar">) {
  const { proximo } = await searchParams;
  return (
    <>
      <Cabecalho />
      <main className="mx-auto w-full max-w-sm flex-1 px-4 py-10">
        <h1 className="titulo mb-6">Entrar</h1>
        <FormEntrar proximo={typeof proximo === "string" ? proximo : undefined} />
      </main>
    </>
  );
}
