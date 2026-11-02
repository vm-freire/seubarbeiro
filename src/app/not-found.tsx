import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-16 text-center">
      <h1 className="titulo">Página não encontrada</h1>
      <p className="mt-2 text-suave">Confira o link. Se veio da barbearia, peça o link de novo.</p>
      <Link href="/" className="btn mt-6">Ir para o início</Link>
    </main>
  );
}
