import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { Cabecalho } from "@/components/Cabecalho";
import { Inclinar3D } from "@/components/Inclinar3D";
import { CarrosselTrabalhos } from "@/components/CarrosselTrabalhos";
import { Rodape } from "@/components/Rodape";
import { WhatsFlutuante } from "@/components/WhatsFlutuante";
import { assinaturaLiberada } from "@/lib/assinatura";
import { carregarBarbeariaPublica } from "@/lib/dados";
import { CATEGORIAS, moeda } from "@/lib/formatar";
import { linkMapaEmbutido, linkRota } from "@/lib/maps";
import { precoDoDia } from "@/lib/precos";
import { hojeLocal, NOMES_DIAS } from "@/lib/tempo";
import { linkWhats, telefoneBonito } from "@/lib/whatsapp";

export async function generateMetadata({ params }: PageProps<"/b/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const d = await carregarBarbeariaPublica(slug);
  return d ? { title: d.barbearia.nome, description: `Agende seu horário na ${d.barbearia.nome}.` } : {};
}

const z = (px: number) => ({ "--z": `${px}px` }) as React.CSSProperties;
const atraso = (ms: number) => ({ "--atraso": `${ms}ms` }) as React.CSSProperties;

export default async function Page({ params }: PageProps<"/b/[slug]">) {
  const { slug } = await params;
  const d = await carregarBarbeariaPublica(slug);
  if (!d) notFound();
  const { barbearia: b, servicos, promocoes, horarios, profissionais, trabalhos } = d;

  const hoje = hojeLocal(b.fuso);
  const rota = linkRota(b);
  const mapa = linkMapaEmbutido(b);
  const whats = linkWhats(b.whatsapp, "Olá! Vim pelo site de agendamento.");
  const liberada = assinaturaLiberada(b);
  const agendar = `/b/${b.slug}/agendar`;

  // Resumo dos dias de atendimento (somando a equipe)
  const porDia = new Map<number, string[]>();
  for (const h of horarios) {
    if (!profissionais.some((p) => p.id === h.profissional_id)) continue;
    const faixa = `${h.inicio.slice(0, 5)}–${h.fim.slice(0, 5)}`;
    const lista = porDia.get(h.dia_semana) ?? [];
    if (!lista.includes(faixa)) lista.push(faixa);
    porDia.set(h.dia_semana, lista);
  }
  // nomes dos serviços para o letreiro; repete até encher a faixa (o loop usa duas cópias)
  const nomesServicos = [...new Set(servicos.map((s) => s.nome.trim()).filter(Boolean))];
  const letreiro = nomesServicos.length ? Array.from({ length: Math.max(nomesServicos.length, 8) }, (_, i) => nomesServicos[i % nomesServicos.length]) : [];
  const promocoesHoje = servicos.filter((s) => precoDoDia(s, promocoes, hoje).promocao);

  return (
    <>
      <Cabecalho barbearia={b.nome} link={`/b/${b.slug}`} />
      <main className="flex-1 overflow-x-clip">
        {/* Capa */}
        <section className="relative isolate flex min-h-[70vh] items-end overflow-hidden bg-[#0f0d0c] pt-16 pb-14 text-[#f3ede2]">
          {b.capa_url ? (
            <Image src={b.capa_url} alt="" fill priority sizes="100vw" className="paralaxe -z-10 object-cover opacity-55" />
          ) : (
            <div className="paralaxe faixa-listrada absolute -inset-20 -z-10 rotate-6 opacity-[0.12]" aria-hidden="true" />
          )}
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0f0d0c] via-[#0f0d0c]/60 to-transparent" aria-hidden="true" />
          <div className="mx-auto w-full max-w-6xl px-4">
            <p className="sobretitulo entrar !text-[#ff6b7d]">{b.cidade ?? "Barbearia"}</p>
            <h1 className="entrar mt-2 font-titulo text-6xl leading-[0.88] font-black uppercase sm:text-8xl" style={atraso(100)}>
              {b.nome}
            </h1>
            {b.descricao && (
              <p className="entrar mt-4 max-w-xl text-lg opacity-85" style={atraso(200)}>{b.descricao}</p>
            )}
            <div className="entrar mt-8 flex flex-wrap gap-3" style={atraso(300)}>
              {liberada ? (
                <Link href={agendar} className="btn-primario px-8 text-base">Agendar horário</Link>
              ) : (
                <p className="aviso selo-amarelo">O agendamento online está pausado. Fale com a barbearia pelo WhatsApp.</p>
              )}
              {rota && (
                <a href={rota} target="_blank" rel="noopener noreferrer" className="btn border-white/30 bg-white/10 px-6 text-base text-[#f3ede2] hover:border-white">
                  Como chegar
                </a>
              )}
            </div>
            {promocoesHoje.length > 0 && (
              <p className="entrar mt-6 text-sm" style={atraso(400)}>
                <span className="selo selo-verde mr-2">Promoção hoje</span>
                {promocoesHoje.map((s) => s.nome).join(", ")}
              </p>
            )}
          </div>
        </section>

        {/* Letreiro com os serviços (mesmo estilo da página inicial) */}
        {letreiro.length > 0 && (
          <div className="border-y border-borda bg-texto py-3 text-fundo" aria-hidden="true">
            <div className="letreiro flex w-max gap-8 font-titulo text-2xl font-extrabold tracking-wider uppercase">
              {[...letreiro, ...letreiro].map((nome, i) => (
                <span key={i} className="flex items-center gap-8 whitespace-nowrap">
                  {nome} <span className="text-destaque">✦</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Trabalhos: carrossel deslizando */}
        {trabalhos.length > 0 && (
          <section className="relative pt-20">
            <span className="titulo-fundo" aria-hidden="true">Trabalhos</span>
            <div className="relative mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-3 px-4">
              <div>
                <p className="sobretitulo">Feito aqui</p>
                <h2 className="titulo mt-2 text-4xl sm:text-5xl">Nossos trabalhos</h2>
              </div>
              <Link href={`/b/${b.slug}/galeria`} className="btn">
                Ver galeria ({trabalhos.length})
              </Link>
            </div>
            <div className="mt-8">
              <CarrosselTrabalhos fotos={trabalhos} slug={b.slug} />
            </div>
          </section>
        )}

        {/* Sobre nós */}
        {b.sobre && (
          <section className="mx-auto max-w-3xl px-4 pt-20">
            <div className="revelar">
              <p className="sobretitulo">Quem somos</p>
              <h2 className="titulo mt-2 text-4xl sm:text-5xl">Sobre nós</h2>
              <div className="mt-6 space-y-4 text-lg leading-relaxed">
                {b.sobre
                  .split(/\n\s*\n/)
                  .map((p) => p.trim())
                  .filter(Boolean)
                  .map((p, i) => (
                    <p key={i} className="whitespace-pre-line">{p}</p>
                  ))}
              </div>
            </div>
          </section>
        )}

        {/* Profissionais */}
        {profissionais.length > 0 && (
          <section className="relative mx-auto max-w-6xl px-4 pt-24 pb-10">
            <span className="titulo-fundo" aria-hidden="true">Profissionais</span>
            <div className="relative text-center">
              <p className="sobretitulo">Nossa equipe</p>
              <h2 className="titulo mt-2 text-4xl sm:text-5xl">Escolha quem vai te atender</h2>
            </div>
            <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {profissionais.map((p) => (
                <li key={p.id} className="revelar">
                  <Inclinar3D className="rounded-3xl" max={10}>
                    <Link
                      href={liberada ? `${agendar}?p=${p.id}` : `/b/${b.slug}`}
                      className="group relative block rounded-3xl border border-borda bg-superficie"
                      style={{ boxShadow: "var(--sombra)", transformStyle: "preserve-3d" }}
                    >
                      <div className="relative aspect-[4/5] rounded-t-3xl bg-texto" style={{ transformStyle: "preserve-3d" }}>
                        <div className="absolute inset-0 overflow-hidden rounded-t-3xl">
                          {p.foto_url ? (
                            <Image
                              src={p.foto_url}
                              alt={p.nome}
                              fill
                              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                              className="object-cover transition duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="grid h-full place-items-center">
                              <Avatar nome={p.nome} tamanho={140} className="!bg-destaque !text-destaque-texto" />
                            </div>
                          )}
                        </div>
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-5 pt-16 text-[#f3ede2]" style={{ transformStyle: "preserve-3d" }}>
                          <div className="camada-3d" style={z(40)}>
                            <p className="text-xs font-bold tracking-[0.25em] text-[#ff8a99] uppercase">{p.titulo}</p>
                            <p className="font-titulo text-3xl leading-none font-extrabold uppercase">{p.nome}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3 p-4" style={{ transformStyle: "preserve-3d" }}>
                        <p className="line-clamp-2 text-sm text-suave">{p.bio || "Veja os horários livres"}</p>
                        <span className="camada-3d shrink-0 font-bold text-destaque" style={z(28)}>Horários →</span>
                      </div>
                    </Link>
                  </Inclinar3D>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Serviços */}
        <section className="relative mx-auto max-w-4xl px-4 pt-24 pb-10">
          <span className="titulo-fundo" aria-hidden="true">Serviços</span>
          <div className="relative text-center">
            <p className="sobretitulo">Tabela</p>
            <h2 className="titulo mt-2 text-4xl sm:text-5xl">Serviços e preços</h2>
          </div>
          {servicos.length === 0 ? (
            <p className="mt-8 text-center text-sm text-suave">A barbearia ainda não cadastrou os serviços.</p>
          ) : (
            <ul className="mt-12 space-y-3">
              {servicos.map((s) => {
                const p = precoDoDia(s, promocoes, hoje);
                return (
                  <li key={s.id} className="revelar">
                    <Link
                      href={liberada ? `${agendar}?s=${s.id}` : `/b/${b.slug}`}
                      className="group flex items-center justify-between gap-4 rounded-2xl border border-borda bg-superficie p-4 transition hover:border-destaque"
                    >
                      <div className="min-w-0">
                        <p className="font-titulo text-2xl leading-tight font-extrabold uppercase">{s.nome}</p>
                        <p className="text-sm text-suave">
                          {CATEGORIAS[s.categoria]} · {s.duracao_min} min{s.descricao ? ` · ${s.descricao}` : ""}
                        </p>
                        {p.promocao && <span className="selo selo-verde mt-1">Hoje: {p.promocao}</span>}
                      </div>
                      <div className="flex shrink-0 items-center gap-3 text-right">
                        <div>
                          {p.promocao && <p className="text-xs text-suave line-through">{moeda(p.precoTabela)}</p>}
                          <p className="font-titulo text-2xl font-black text-destaque">{moeda(p.preco)}</p>
                        </div>
                        <span className="hidden text-xl transition group-hover:translate-x-1 sm:inline" aria-hidden="true">→</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Horários e endereço */}
        <section className="mx-auto grid max-w-4xl gap-5 px-4 py-16 md:grid-cols-2">
          {porDia.size > 0 && (
            <div className="revelar cartao">
              <h2 className="subtitulo mb-3">Horário de atendimento</h2>
              <ul className="space-y-1.5 text-sm">
                {[1, 2, 3, 4, 5, 6, 0].map((dia) => (
                  <li key={dia} className="flex justify-between gap-4 border-b border-borda/60 pb-1.5 last:border-0">
                    <span className="font-semibold">{NOMES_DIAS[dia]}</span>
                    <span className="text-suave">{porDia.get(dia)?.sort().join(", ") ?? "Fechado"}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="revelar cartao flex flex-col">
            <h2 className="subtitulo mb-3">Onde estamos</h2>
            {(b.endereco || b.cidade) && <p>{[b.endereco, b.cidade].filter(Boolean).join(" · ")}</p>}
            {b.whatsapp && <p className="mt-1 text-sm text-suave">WhatsApp {telefoneBonito(b.whatsapp)}</p>}
            {mapa && (
              <iframe
                src={mapa}
                title={`Mapa: ${b.nome}`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="mt-4 aspect-[4/3] w-full rounded-xl border border-borda bg-superficie-2"
              />
            )}
            <div className="mt-auto flex flex-wrap gap-2 pt-5">
              {rota && <a href={rota} target="_blank" rel="noopener noreferrer" className="btn-primario">Traçar rota no Google Maps</a>}
              {b.instagram && (
                <a href={`https://instagram.com/${b.instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" className="btn">
                  Instagram
                </a>
              )}
            </div>
          </div>
        </section>
      </main>
      {whats && <WhatsFlutuante href={whats} />}
      <Rodape />
    </>
  );
}
