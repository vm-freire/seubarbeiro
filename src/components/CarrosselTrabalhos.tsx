import Image from "next/image";
import Link from "next/link";
import type { Trabalho } from "@/lib/tipos";

/**
 * Faixa de fotos deslizando sem parar (CSS puro). A fila é repetida até ter
 * pelo menos 8 fotos e depois duplicada, para o fim emendar no começo.
 * Cada foto abre a galeria já nela.
 */
export function CarrosselTrabalhos({ fotos, slug }: { fotos: Trabalho[]; slug: string }) {
  const base = fotos.slice(0, 24);
  const fila = Array.from({ length: Math.ceil(8 / base.length) }, () => base).flat();
  const duracao = { "--duracao": `${fila.length * 5}s` } as React.CSSProperties;

  const item = (t: Trabalho, i: number, copia: boolean) => (
    <li key={`${copia ? "c" : "o"}-${i}`} className={`shrink-0 snap-start px-2 ${copia ? "carrossel-copia" : ""}`} aria-hidden={copia || undefined}>
      <Link
        href={`/b/${slug}/galeria?foto=${t.id}`}
        tabIndex={copia ? -1 : undefined}
        className="group relative block h-72 w-56 overflow-hidden rounded-2xl bg-superficie-2 sm:h-80 sm:w-64"
        style={{ boxShadow: "var(--sombra)" }}
      >
        <Image src={t.url} alt={copia ? "" : t.legenda ?? "Trabalho da barbearia"} fill sizes="256px" className="object-cover transition duration-500 group-hover:scale-105" />
        {t.legenda && (
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-10 text-sm font-semibold text-white">{t.legenda}</span>
        )}
      </Link>
    </li>
  );

  return (
    <div className="carrossel py-2">
      <ul className="carrossel-trilho" style={duracao}>
        {fila.map((t, i) => item(t, i, i >= base.length))}
        {fila.map((t, i) => item(t, i + fila.length, true))}
      </ul>
    </div>
  );
}
