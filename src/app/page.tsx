import Link from "next/link";
import { Cabecalho } from "@/components/Cabecalho";
import { Inclinar3D } from "@/components/Inclinar3D";
import { LogoMarca } from "@/components/Logo";
import { Rodape } from "@/components/Rodape";

const recursos = [
  ["01", "Agenda pelo link", "O cliente escolhe o barbeiro, o serviço, o dia e o horário pelo celular. Sem ligação, sem conversa longa."],
  ["02", "Aviso na hora", "Marcou ou desmarcou, o painel avisa com som. Se o cliente desmarcar, o horário volta a ficar livre."],
  ["03", "Sua equipe", "Convide seus barbeiros. Cada um cuida da própria agenda; você enxerga tudo."],
  ["04", "Preços e promoções", "Tabela de serviços, combos e promoções por dia da semana ou período."],
  ["05", "Fechamento de caixa", "Cortes, barbas e sobrancelhas do dia, e quanto entrou no Pix, débito, crédito e dinheiro."],
  ["06", "Rota no mapa", "Cliente novo toca num botão e o Google Maps mostra o caminho até você."],
];

const passos = [
  ["Crie sua barbearia", "Nome, link, serviços e horários. Já vem um exemplo pronto para ajustar."],
  ["Mande o link", "Coloque na resposta automática do WhatsApp e no Instagram."],
  ["Atenda e feche o caixa", "A agenda se enche sozinha e o relatório sai com um toque."],
];

const z = (px: number) => ({ "--z": `${px}px` }) as React.CSSProperties;

const palavras = ["Corte", "Barba", "Sobrancelha", "Degradê", "Pigmentação", "Combo", "Navalhado", "Pezinho"];

export default function Home() {
  return (
    <>
      <Cabecalho />
      <main className="flex-1 overflow-x-clip">
        {/* Abertura */}
        <section className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pt-10 pb-16 md:grid-cols-[1.2fr_1fr] md:pt-16">
          <div>
            <p className="sobretitulo entrar">Agendamento para barbearias</p>
            <h1 className="mt-3 font-titulo text-6xl leading-[0.9] font-black uppercase sm:text-7xl lg:text-8xl">
              <span className="entrar block" style={{ "--atraso": "80ms" } as React.CSSProperties}>A cadeira</span>
              <span className="entrar block text-destaque" style={{ "--atraso": "180ms" } as React.CSSProperties}>sempre cheia.</span>
              <span className="entrar block" style={{ "--atraso": "280ms" } as React.CSSProperties}>Sem furo.</span>
            </h1>
            <p className="entrar mt-6 max-w-md text-lg text-suave" style={{ "--atraso": "380ms" } as React.CSSProperties}>
              Seus clientes marcam pelo link, você recebe o aviso na hora e fecha o caixa do dia com um toque.
            </p>
            <div className="entrar mt-8 flex flex-wrap gap-3" style={{ "--atraso": "480ms" } as React.CSSProperties}>
              <Link href="/cadastro?tipo=barbeiro" className="btn-primario px-7 text-base">Cadastrar minha barbearia</Link>
              <Link href="/entrar" className="btn px-7 text-base">Já tenho conta</Link>
            </div>
            <p className="entrar mt-3 text-sm text-suave" style={{ "--atraso": "560ms" } as React.CSSProperties}>7 dias grátis, sem cartão. Depois, R$ 70 por mês.</p>
          </div>

          {/* "Celular" com os avisos do painel: inclina em 3D seguindo o mouse */}
          <div className="entrar relative mx-auto w-full max-w-xs" style={{ "--atraso": "300ms" } as React.CSSProperties}>
            <Inclinar3D className="rounded-[2rem]">
              <div
                className="faixa-listrada camada-3d pointer-events-none absolute -inset-4 rotate-3 rounded-[2.5rem] opacity-90"
                style={z(-60)}
                aria-hidden="true"
              />
              <div className="relative rounded-[2rem] border border-borda bg-superficie p-4" style={{ boxShadow: "var(--sombra)", transformStyle: "preserve-3d" }}>
                <div className="camada-3d mb-3 flex items-center gap-2 border-b border-borda pb-3" style={z(24)}>
                  <LogoMarca tamanho={34} animado />
                  <div className="flex-1 leading-tight">
                    <p className="text-sm font-bold">Barbearia do João</p>
                    <p className="text-xs text-suave">Avisos do painel</p>
                  </div>
                  <span className="relative grid size-9 place-items-center rounded-full border border-borda" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                    </svg>
                    <span className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-destaque text-[0.6rem] font-black text-destaque-texto">2</span>
                  </span>
                </div>
                <div className="space-y-2 text-sm" style={{ transformStyle: "preserve-3d" }}>
                  <div className="camada-3d flex gap-2.5 rounded-2xl bg-superficie-2 p-3" style={z(44)}>
                    <span className="w-1 shrink-0 rounded-full bg-[var(--verde-texto)]" />
                    <p className="leading-snug">
                      <strong className="block">Novo horário</strong>
                      <span className="text-suave">Pedro marcou <strong className="text-texto">hoje às 15:00</strong> (Corte + Barba)</span>
                    </p>
                  </div>
                  <div className="camada-3d flex gap-2.5 rounded-2xl bg-superficie-2 p-3" style={z(36)}>
                    <span className="w-1 shrink-0 rounded-full bg-[var(--vermelho-texto)]" />
                    <p className="leading-snug">
                      <strong className="block">Horário desmarcado</strong>
                      <span className="text-suave">Lucas desmarcou amanhã às 10:00</span>
                    </p>
                  </div>
                  <p className="camada-3d ml-auto w-fit rounded-full bg-[var(--verde-fundo)] px-3 py-2 font-semibold text-[var(--verde-texto)]" style={z(56)}>
                    10:00 livre de novo ✓
                  </p>
                </div>
              </div>
            </Inclinar3D>
          </div>
        </section>

        {/* Letreiro */}
        <div className="border-y border-borda bg-texto py-3 text-fundo" aria-hidden="true">
          <div className="letreiro flex w-max gap-8 font-titulo text-2xl font-extrabold tracking-wider uppercase">
            {[...palavras, ...palavras].map((p, i) => (
              <span key={i} className="flex items-center gap-8">
                {p} <span className="text-destaque">✦</span>
              </span>
            ))}
          </div>
        </div>

        {/* Recursos */}
        <section className="relative mx-auto max-w-6xl px-4 pt-24 pb-16">
          <span className="titulo-fundo" aria-hidden="true">Recursos</span>
          <div className="relative text-center">
            <p className="sobretitulo">Tudo num lugar só</p>
            <h2 className="titulo mt-2 text-4xl sm:text-5xl">Feito para a rotina da barbearia</h2>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recursos.map(([n, t, d]) => (
              <article key={t} className="revelar cartao group transition hover:-translate-y-1 hover:border-destaque">
                <span className="font-titulo text-4xl font-black text-destaque/80 transition group-hover:text-destaque">{n}</span>
                <h3 className="mt-2 font-titulo text-2xl font-extrabold uppercase">{t}</h3>
                <p className="mt-1 text-sm text-suave">{d}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Como funciona */}
        <section className="relative bg-fundo-2 py-24">
          <span className="titulo-fundo" aria-hidden="true">Simples</span>
          <div className="relative mx-auto max-w-6xl px-4">
            <div className="text-center">
              <p className="sobretitulo">Como funciona</p>
              <h2 className="titulo mt-2 text-4xl sm:text-5xl">Em três passos</h2>
            </div>
            <ol className="mt-12 grid gap-6 md:grid-cols-3">
              {passos.map(([t, d], i) => (
                <li key={t} className="revelar relative pl-16">
                  <span className="absolute top-0 left-0 grid size-12 place-items-center rounded-full bg-destaque font-titulo text-2xl font-black text-destaque-texto">
                    {i + 1}
                  </span>
                  <h3 className="font-titulo text-2xl font-extrabold uppercase">{t}</h3>
                  <p className="mt-1 text-suave">{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Chamada final */}
        <section className="mx-auto max-w-6xl px-4 py-24">
          <div className="revelar relative overflow-hidden rounded-3xl bg-texto px-6 py-14 text-center text-fundo" style={{ "--logo-contorno": "var(--fundo)" } as React.CSSProperties}>
            <div className="faixa-listrada absolute inset-x-0 top-0 h-3" aria-hidden="true" />
            <LogoMarca tamanho={64} animado className="mx-auto" />
            <h2 className="mt-4 font-titulo text-4xl font-black uppercase sm:text-6xl">Bora encher essa agenda?</h2>
            <p className="mx-auto mt-3 max-w-md opacity-80">Leva dois minutos para criar a sua barbearia.</p>
            <Link href="/cadastro?tipo=barbeiro" className="btn-primario mt-8 px-8 text-base">Começar agora</Link>
          </div>
        </section>
      </main>
      <Rodape />
    </>
  );
}
