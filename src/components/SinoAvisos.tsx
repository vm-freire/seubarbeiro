"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { haQuanto, naoLidos, ROTULO_AVISO, textoAviso, type Aviso } from "@/lib/avisos";
import { liberarSom, mudarSom, somMudo, tocarAviso } from "@/lib/somAviso";
import { createClient } from "@/lib/supabase/client";
import { partesLocais } from "@/lib/tempo";

type Toast = Aviso & { chave: number };

/**
 * Sino do painel: avisa na hora (Supabase Realtime) quando um cliente marca,
 * desmarca, confirma ou remarca. Mostra um cartão no canto, toca um som e
 * atualiza a página. O barbeiro recebe só os dele (o banco filtra); o dono
 * também, a não ser que marque "Ver também a equipe" (soDe = null).
 * Não avisa a própria pessoa do que ela mesma fez.
 */
export function SinoAvisos({
  barbeariaId,
  userId,
  dono,
  fuso,
  soDe,
}: {
  barbeariaId: string;
  userId: string;
  dono: boolean;
  fuso: string;
  /** id do profissional cujos avisos aparecem (null = todos que o banco liberar) */
  soDe: string | null;
}) {
  const router = useRouter();
  const chaveVisto = `avisos-visto-${barbeariaId}`;
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  // preferências salvas neste aparelho (só aparecem depois de abrir o sino, então não mudam o HTML do servidor)
  const [vistoAte, setVistoAte] = useState<string | null>(() => {
    try {
      return typeof window === "undefined" ? null : localStorage.getItem(chaveVisto);
    } catch {
      return null;
    }
  });
  const [aberto, setAberto] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mudo, setMudo] = useState(() => typeof window !== "undefined" && somMudo());
  const [permissao, setPermissao] = useState<NotificationPermission | "sem-suporte">(() =>
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "sem-suporte",
  );
  const [balancar, setBalancar] = useState(0);
  const [agora, setAgora] = useState(() => Date.now());
  const caixa = useRef<HTMLDivElement>(null);
  const contador = useRef(0);

  const buscar = useCallback(async () => {
    let q = createClient()
      .from("notificacoes")
      .select("*")
      .eq("barbearia_id", barbeariaId)
      .or(`autor.is.null,autor.neq.${userId}`);
    if (soDe) q = q.eq("profissional_id", soDe);
    const { data } = await q.order("criado_em", { ascending: false }).limit(30);
    return (data ?? null) as Aviso[] | null;
  }, [barbeariaId, userId, soDe]);

  // primeira carga, som e volta para a aba
  useEffect(() => {
    const carregar = () =>
      buscar().then((lista) => {
        if (lista) setAvisos(lista);
        setAgora(Date.now());
      });
    void carregar();
    const parar = liberarSom();
    const relogio = setInterval(() => setAgora(Date.now()), 60_000);
    // aba em segundo plano pode perder a conexão: ao voltar, busca de novo
    const aoVoltar = () => {
      if (document.visibilityState === "visible") void carregar();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      parar();
      clearInterval(relogio);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [buscar]);

  // tempo real
  useEffect(() => {
    const supabase = createClient();
    let canal: ReturnType<typeof supabase.channel> | null = null;
    let ativo = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) supabase.realtime.setAuth(data.session.access_token);
      if (!ativo) return;
      canal = supabase
        .channel(`avisos-${barbeariaId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notificacoes", filter: `barbearia_id=eq.${barbeariaId}` },
          (msg) => {
            const novo = msg.new as Aviso;
            if (novo.autor === userId) return;
            if (soDe && novo.profissional_id !== soDe) return; // dono vendo só a própria agenda
            setAvisos((lista) => (lista.some((a) => a.id === novo.id) ? lista : [novo, ...lista].slice(0, 30)));
            const chave = ++contador.current;
            setToasts((t) => [...t.slice(-2), { ...novo, chave }]);
            setTimeout(() => setToasts((t) => t.filter((x) => x.chave !== chave)), 8000);
            setBalancar(chave);
            setAgora(Date.now());
            tocarAviso(novo.tipo);
            if (document.visibilityState === "hidden" && "Notification" in window && Notification.permission === "granted") {
              try {
                new Notification(ROTULO_AVISO[novo.tipo].titulo, { body: textoAviso(novo, { comProfissional: dono && !soDe, fuso }), tag: novo.id });
              } catch {
                // celular sem suporte a aviso fora do service worker: fica o aviso na página
              }
            }
            router.refresh(); // agenda e "Hoje" já mostram a mudança
          },
        )
        .subscribe();
    })();
    return () => {
      ativo = false;
      if (canal) void supabase.removeChannel(canal);
    };
  }, [barbeariaId, userId, dono, fuso, soDe, router]);

  // fecha ao clicar fora ou com Esc
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  function abrirFechar() {
    const abrir = !aberto;
    setAberto(abrir);
    if (abrir && avisos.length) {
      const ultimo = avisos[0].criado_em;
      setVistoAte(ultimo);
      try {
        localStorage.setItem(chaveVisto, ultimo);
      } catch {}
    }
  }

  function alternarSom() {
    const novo = !mudo;
    setMudo(novo);
    mudarSom(novo);
    if (!novo) tocarAviso("marcou"); // amostra do som
  }

  async function pedirPermissao() {
    if (!("Notification" in window)) return;
    setPermissao(await Notification.requestPermission());
  }

  const pendentes = naoLidos(avisos, vistoAte);
  const linkDia = (a: Aviso) => (a.inicio ? `/painel/agenda?d=${partesLocais(new Date(a.inicio), fuso).data}` : "/painel/agenda");
  const texto = (a: Aviso) => textoAviso(a, { comProfissional: dono && !soDe, fuso, agora: new Date(agora) });

  return (
    <div ref={caixa} className="relative">
      <button
        type="button"
        onClick={abrirFechar}
        className="btn btn-pequeno relative aspect-square px-0"
        aria-label={pendentes ? `Avisos: ${pendentes} novo${pendentes === 1 ? "" : "s"}` : "Avisos"}
        aria-expanded={aberto}
        title="Avisos"
      >
        <svg key={balancar} className={balancar ? "sino-balanca" : undefined} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {pendentes > 0 && (
          <span className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-destaque px-1 text-[0.65rem] font-black text-destaque-texto ring-2 ring-superficie">
            {pendentes > 9 ? "9+" : pendentes}
          </span>
        )}
      </button>

      {aberto && (
        <div className="fixed inset-x-3 top-16 z-50 overflow-hidden rounded-2xl border border-borda bg-superficie sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:w-96" style={{ boxShadow: "var(--sombra)" }}>
          <div className="flex items-center justify-between gap-2 border-b border-borda px-4 py-3">
            <p className="subtitulo">Avisos</p>
            <button type="button" onClick={alternarSom} className="btn btn-pequeno" aria-pressed={!mudo}>
              {mudo ? "Som desligado" : "Som ligado"}
            </button>
          </div>
          {permissao === "default" && (
            <button type="button" onClick={pedirPermissao} className="block w-full border-b border-borda bg-superficie-2 px-4 py-2 text-left text-xs font-semibold hover:text-destaque">
              Avisar também com a aba em segundo plano →
            </button>
          )}
          {avisos.length === 0 ? (
            <p className="px-4 py-6 text-sm text-suave">Nenhum aviso ainda. Quando um cliente marcar ou desmarcar um horário, aparece aqui.</p>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-borda overflow-y-auto">
              {avisos.map((a) => {
                const novo = !vistoAte || new Date(a.criado_em) > new Date(vistoAte);
                return (
                  <li key={a.id}>
                    <Link href={linkDia(a)} onClick={() => setAberto(false)} className={`flex gap-3 px-4 py-3 text-sm hover:bg-superficie-2 ${novo ? "bg-superficie-2/60" : ""}`}>
                      <span className="mt-1.5 size-2.5 shrink-0 rounded-full" aria-hidden="true" style={{ background: `var(--${ROTULO_AVISO[a.tipo].cor}-texto)` }} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{ROTULO_AVISO[a.tipo].titulo}</span>
                        <span className="block text-suave">{texto(a)}</span>
                      </span>
                      <span className="shrink-0 text-xs text-suave">{haQuanto(a.criado_em, agora)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* cartões que aparecem no canto quando chega um aviso */}
      <div className="pointer-events-none fixed right-3 bottom-3 left-3 z-[60] flex flex-col items-end gap-2 sm:left-auto sm:w-96" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.chave} className="aviso-chegando pointer-events-auto flex w-full gap-3 overflow-hidden rounded-2xl border border-borda bg-superficie p-3 pl-0" style={{ boxShadow: "var(--sombra)" }} role="status">
            <span className="w-1.5 shrink-0 rounded-r-full" style={{ background: `var(--${ROTULO_AVISO[t.tipo].cor}-texto)` }} aria-hidden="true" />
            <Link href={linkDia(t)} className="min-w-0 flex-1 text-sm" onClick={() => setToasts((x) => x.filter((y) => y.chave !== t.chave))}>
              <span className="block font-bold">{ROTULO_AVISO[t.tipo].titulo}</span>
              <span className="block text-suave">{texto(t)}</span>
            </Link>
            <button type="button" onClick={() => setToasts((x) => x.filter((y) => y.chave !== t.chave))} className="grid size-8 shrink-0 place-items-center rounded-full text-suave hover:bg-superficie-2 hover:text-texto" aria-label="Fechar aviso">
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
