import Link from "next/link";
import { Cabecalho } from "@/components/Cabecalho";

const recursos = [
  ["Agendamento pelo link", "O cliente escolhe serviço, dia e horário pelo celular. Sem ligação, sem conversa longa."],
  ["Confirmação pelo WhatsApp", "Antes do horário, o cliente responde Vou ou Não vou. Se não vier, o horário fica livre."],
  ["Agenda do seu jeito", "Dias e horários de atendimento, folgas, horários extras e até quando a agenda fica aberta."],
  ["Preços e promoções", "Tabela de serviços, combos e promoções por dia da semana ou por período."],
  ["Fechamento de caixa", "Quantos cortes, barbas e sobrancelhas, e quanto entrou no Pix, débito, crédito e dinheiro."],
  ["Rota no mapa", "Cliente novo toca num botão e o Google Maps mostra o caminho até a barbearia."],
];

export default function Home() {
  return (
    <>
      <Cabecalho />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12">
        <section className="max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">A agenda da sua barbearia, sem furo.</h1>
          <p className="mt-4 text-lg text-suave">
            Seus clientes marcam pelo link, confirmam pelo WhatsApp e você fecha o caixa do dia com um toque.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/cadastro?tipo=barbeiro" className="btn-primario">Cadastrar minha barbearia</Link>
            <Link href="/entrar" className="btn">Já tenho conta</Link>
          </div>
          <p className="mt-3 text-sm text-suave">Gratuito durante o período de testes.</p>
        </section>

        <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recursos.map(([t, d]) => (
            <div key={t} className="cartao">
              <h2 className="font-semibold">{t}</h2>
              <p className="mt-1 text-sm text-suave">{d}</p>
            </div>
          ))}
        </section>

        <p className="mt-16 text-sm text-suave">
          É cliente? Peça à sua barbearia o link de agendamento.
        </p>
      </main>
    </>
  );
}
