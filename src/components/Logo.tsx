/**
 * Marca "Seu Barbeiro": balão de conversa (agendamento pelo WhatsApp)
 * com um poste de barbeiro dentro. As listras sobem como no poste de
 * verdade quando `animado` (respeita prefers-reduced-motion no CSS).
 */
import { useId } from "react";

// Listras inclinadas, período vertical de 9 (a animação sobe exatamente 9)
const LISTRAS = Array.from({ length: 8 }, (_, i) => 4 + i * 9);

export function LogoMarca({ tamanho = 36, animado = false, className = "" }: { tamanho?: number; animado?: boolean; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Seu Barbeiro"
      className={`shrink-0 ${className}`}
    >
      <defs>
        <clipPath id={`poste-${id}`}>
          <rect x="24" y="14" width="16" height="28" rx="8" />
        </clipPath>
      </defs>
      <path
        d="M18 4h28a14 14 0 0 1 14 14v20a14 14 0 0 1-14 14H25l-12 9 2-10.2A14 14 0 0 1 4 38V18A14 14 0 0 1 18 4Z"
        fill="var(--logo-balao, #141110)"
        stroke="var(--logo-contorno, #f3ede2)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <rect x="24" y="14" width="16" height="28" rx="8" fill="#f8f4ec" />
      <g clipPath={`url(#poste-${id})`}>
        <g className={animado ? "listras-poste" : undefined}>
          {LISTRAS.map((y) => (
            <polygon key={y} points={`20,${y + 8} 44,${y - 6} 44,${y - 2} 20,${y + 12}`} fill="#d7263d" />
          ))}
        </g>
      </g>
      <rect x="22" y="10" width="20" height="5" rx="2.5" fill="#c9a227" />
      <rect x="22" y="41" width="20" height="5" rx="2.5" fill="#c9a227" />
    </svg>
  );
}

export function Logo({ animado = false, tamanho = 36, barbearia }: { animado?: boolean; tamanho?: number; barbearia?: string }) {
  if (barbearia) {
    // Barbearia com nome próprio: o nome dela em destaque, "Seu Barbeiro" continua junto
    return (
      <span className="flex items-center gap-2.5">
        <LogoMarca tamanho={tamanho} animado={animado} />
        <span className="flex flex-col leading-none">
          <span className="font-titulo text-xl font-extrabold tracking-wide uppercase">{barbearia}</span>
          <span className="mt-0.5 text-[0.65rem] font-semibold tracking-[0.2em] text-suave uppercase">por Seu Barbeiro</span>
        </span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-2.5">
      <LogoMarca tamanho={tamanho} animado={animado} />
      <span className="font-titulo text-2xl leading-none font-extrabold tracking-wide uppercase">
        <span className="font-semibold text-suave">Seu</span> Barbeiro
      </span>
    </span>
  );
}
