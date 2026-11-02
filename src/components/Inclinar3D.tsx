"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Cartão que inclina em 3D seguindo o mouse: o lado onde o mouse está
 * "afunda" e um brilho acompanha o ponteiro. Partes de dentro com a classe
 * .camada-3d e style={{"--z": "30px"}} ficam "flutuando" na frente
 * (e sobem mais um pouco quando o mouse passa em cima delas).
 * Só com mouse/caneta; no toque e com "reduzir movimento" fica parado.
 */
export function Inclinar3D({
  children,
  className = "",
  max = 12,
  brilho = true,
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
  brilho?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const quadro = useRef(0);
  const [ligado, setLigado] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    const ver = () => setLigado(mq.matches);
    ver();
    mq.addEventListener("change", ver);
    return () => {
      mq.removeEventListener("change", ver);
      cancelAnimationFrame(quadro.current);
    };
  }, []);

  function mover(e: React.PointerEvent<HTMLDivElement>) {
    if (!ligado || e.pointerType === "touch") return;
    const el = ref.current;
    if (!el) return;
    const { clientX, clientY } = e;
    cancelAnimationFrame(quadro.current);
    quadro.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
      const y = Math.min(1, Math.max(0, (clientY - r.top) / r.height));
      el.style.setProperty("--ry", `${((x - 0.5) * max).toFixed(2)}deg`);
      el.style.setProperty("--rx", `${((0.5 - y) * max).toFixed(2)}deg`);
      el.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
      el.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
      el.dataset.mexendo = "";
    });
  }

  function soltar() {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(quadro.current);
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    delete el.dataset.mexendo;
  }

  return (
    <div className="cena-3d" onPointerMove={mover} onPointerLeave={soltar}>
      <div ref={ref} className={`inclinar-3d ${className}`} data-ligado={ligado ? "" : undefined}>
        {children}
        {brilho && ligado && <span className="brilho-3d" aria-hidden="true" />}
      </div>
    </div>
  );
}
