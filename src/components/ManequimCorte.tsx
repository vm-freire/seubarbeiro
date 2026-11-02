"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Brincadeira da página da barbearia: um manequim de cabelo comprido.
 * Onde o mouse (ou o dedo) passa, a "máquina" corta os fios naquele ponto
 * e os pedaços caem. Tudo desenhado num <canvas>; nada é salvo.
 */

// medidas lógicas do desenho (o canvas escala para a largura da tela)
const L = 360;
const A = 420;
const CAB = { x: 180, y: 170, rx: 66, ry: 84 }; // cabeça
const PASSOS = 16;
const PASSO = 10.5;
const RAIO_CORTE = 11;
const TOCO = 0.35; // o que sobra de fio depois de "zerar"

type Fio = { pts: [number, number][]; atual: number; total: number; cor: string; largura: number };
type Pedaco = { pts: [number, number][]; vx: number; vy: number; dx: number; dy: number; giro: number; vida: number; cor: string; largura: number };

function dentroDoRosto(x: number, y: number, folga = 1) {
  const dx = (x - CAB.x) / (CAB.rx * folga);
  const dy = (y - CAB.y) / (CAB.ry * folga);
  return dx * dx + dy * dy < 1;
}

function criarFios(): Fio[] {
  const fios: Fio[] = [];
  const cores = ["#2a1a10", "#33200f", "#3d2614", "#24160c", "#4a2f19"];
  for (let i = 0; i < 520; i++) {
    // raiz no couro cabeludo: do lado esquerdo, pelo topo, até o lado direito (altura das orelhas)
    const t = Math.random();
    const ang = -Math.PI - 0.35 + t * (Math.PI + 0.7);
    const encolhe = 0.86 + Math.random() * 0.12;
    let x = CAB.x + CAB.rx * encolhe * Math.cos(ang);
    let y = CAB.y + CAB.ry * encolhe * Math.sin(ang) - 4;
    // cresce para fora e cai para o lado (nunca por cima do rosto)
    const lado = Math.cos(ang) === 0 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(Math.cos(ang)) || 1;
    // começa acompanhando a cabeça (tangente) para o lado, com um pouco de volume para fora
    let dx = lado * -Math.sin(ang) + Math.cos(ang) * 0.35;
    let dy = lado * Math.cos(ang) + Math.sin(ang) * 0.35;
    const pts: [number, number][] = [[x, y]];
    const comprimento = 0.7 + Math.random() * 0.3;
    const curva = (Math.random() - 0.5) * 0.08;
    for (let k = 0; k < PASSOS; k++) {
      const n = Math.hypot(dx, dy) || 1;
      dx /= n;
      dy /= n;
      x += dx * PASSO * comprimento;
      y += dy * PASSO * comprimento;
      // empurra para fora do rosto (cabelo emoldura a cara)
      if (dentroDoRosto(x, y, 1.08)) {
        const a = Math.atan2((y - CAB.y) / CAB.ry, (x - CAB.x) / CAB.rx);
        x = CAB.x + CAB.rx * 1.08 * Math.cos(a);
        y = CAB.y + CAB.ry * 1.08 * Math.sin(a);
      }
      pts.push([x, y]);
      dy += 0.32; // gravidade
      dx += curva + lado * 0.03;
    }
    fios.push({ pts, atual: PASSOS, total: PASSOS, cor: cores[i % cores.length], largura: 1.3 + Math.random() * 0.9 });
  }
  return fios;
}

/** Distância do ponto p ao segmento a-b. */
function distSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const vx = bx - ax;
  const vy = by - ay;
  const len = vx * vx + vy * vy;
  const t = len ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / len)) : 0;
  return Math.hypot(px - (ax + t * vx), py - (ay + t * vy));
}

function desenharFio(ctx: CanvasRenderingContext2D, pts: [number, number][], ate: number) {
  const inteiro = Math.floor(ate);
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let k = 1; k <= inteiro && k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]);
  const resto = ate - inteiro;
  if (resto > 0 && inteiro + 1 < pts.length) {
    const [ax, ay] = pts[inteiro];
    const [bx, by] = pts[inteiro + 1];
    ctx.lineTo(ax + (bx - ax) * resto, ay + (by - ay) * resto);
  }
  ctx.stroke();
}

function desenharManequim(ctx: CanvasRenderingContext2D) {
  // capa listrada (de barbearia) nos ombros
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(40, A);
  ctx.bezierCurveTo(48, 318, 110, 292, 180, 290);
  ctx.bezierCurveTo(250, 292, 312, 318, 320, A);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = "#f3ede2";
  ctx.fillRect(0, 280, L, A);
  ctx.strokeStyle = "#d7263d";
  ctx.lineWidth = 9;
  for (let x = -200; x < L + 200; x += 26) {
    ctx.beginPath();
    ctx.moveTo(x, A);
    ctx.lineTo(x + 140, 280);
    ctx.stroke();
  }
  ctx.restore();
  // pescoço
  ctx.fillStyle = "#d9b48f";
  ctx.beginPath();
  ctx.moveTo(156, 236);
  ctx.lineTo(204, 236);
  ctx.lineTo(208, 296);
  ctx.quadraticCurveTo(180, 304, 152, 296);
  ctx.closePath();
  ctx.fill();
  // cabeça
  ctx.fillStyle = "#e8c9a8";
  ctx.beginPath();
  ctx.ellipse(CAB.x, CAB.y, CAB.rx, CAB.ry, 0, 0, Math.PI * 2);
  ctx.fill();
  // base do cabelo no couro cabeludo (fica como "máquina zero" depois de cortar tudo)
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(CAB.x, CAB.y, CAB.rx + 1, CAB.ry + 1, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#2a1a10";
  ctx.beginPath();
  ctx.moveTo(CAB.x - CAB.rx - 2, CAB.y + 6);
  ctx.quadraticCurveTo(CAB.x - CAB.rx + 4, CAB.y - 40, CAB.x - 30, CAB.y - 44);
  ctx.quadraticCurveTo(CAB.x - 6, CAB.y - 50, CAB.x, CAB.y - 38);
  ctx.quadraticCurveTo(CAB.x + 6, CAB.y - 50, CAB.x + 30, CAB.y - 44);
  ctx.quadraticCurveTo(CAB.x + CAB.rx - 4, CAB.y - 40, CAB.x + CAB.rx + 2, CAB.y + 6);
  ctx.lineTo(CAB.x + CAB.rx + 2, CAB.y - CAB.ry - 2);
  ctx.lineTo(CAB.x - CAB.rx - 2, CAB.y - CAB.ry - 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#e8c9a8";
  // orelhas
  for (const lado of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(CAB.x + lado * (CAB.rx - 2), CAB.y + 10, 9, 15, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // rosto de manequim: olhos fechados, sobrancelhas, nariz e boca
  ctx.strokeStyle = "#8a6247";
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  for (const lado of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(CAB.x + lado * 24, CAB.y + 8, 9, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(CAB.x + lado * 34, CAB.y - 12);
    ctx.quadraticCurveTo(CAB.x + lado * 24, CAB.y - 18, CAB.x + lado * 13, CAB.y - 12);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(CAB.x, CAB.y + 10);
  ctx.quadraticCurveTo(CAB.x - 7, CAB.y + 34, CAB.x + 3, CAB.y + 36);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(CAB.x, CAB.y + 44, 14, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();
}

/** Corta os fios que a máquina tocou (segmento a-b). Devolve se algo mudou. */
function cortarFios(fios: Fio[], pedacos: Pedaco[], ax: number, ay: number, bx: number, by: number) {
  let mudou = false;
  for (const f of fios) {
    const ate = Math.floor(f.atual);
    for (let k = 1; k <= ate; k++) {
      const [px, py] = f.pts[k];
      if (distSeg(px, py, ax, ay, bx, by) >= RAIO_CORTE) continue;
      const novo = Math.max(TOCO, k - 1 + 0.5 * Math.random());
      if (novo < f.atual) {
        // pedaço que cai
        const queda = f.pts.slice(Math.floor(novo), Math.min(f.pts.length, Math.ceil(f.atual) + 1)).map(([x, y]) => [x, y] as [number, number]);
        if (queda.length > 1 && pedacos.length < 400) {
          pedacos.push({ pts: queda, vx: (Math.random() - 0.5) * 1.6, vy: -0.5 - Math.random(), dx: 0, dy: 0, giro: 0, vida: 1, cor: f.cor, largura: f.largura });
        }
        f.atual = novo;
        mudou = true;
      }
      break;
    }
  }
  return mudou;
}

function porcentagemCortada(fios: Fio[]) {
  const soma = fios.reduce((t, f) => t + f.atual, 0);
  return fios.length ? Math.round((1 - soma / (fios.length * PASSOS)) * 100) : 0;
}

/** Anima os pedaços caindo e o cabelo crescendo. Devolve se ainda tem o que animar. */
function passoAnimacao(fios: Fio[], pedacos: Pedaco[], crescendo: boolean) {
  for (const p of pedacos) {
    p.vy += 0.35;
    p.dx += p.vx;
    p.dy += p.vy;
    p.vida -= 0.018;
  }
  let falta = false;
  if (crescendo) {
    for (const f of fios) {
      if (f.atual < f.total) {
        f.atual = Math.min(f.total, f.atual + 0.45);
        falta = true;
      }
    }
  }
  return falta;
}

export function ManequimCorte() {
  const tela = useRef<HTMLCanvasElement>(null);
  const fios = useRef<Fio[]>([]);
  const pedacos = useRef<Pedaco[]>([]);
  const anterior = useRef<[number, number] | null>(null);
  const quadro = useRef(0);
  const crescendo = useRef(false);
  const desenhar = useRef<() => void>(() => {});
  const [cortado, setCortado] = useState(0);

  useEffect(() => {
    const c = tela.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const calma = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    fios.current = criarFios();

    const ajustar = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const largura = c.clientWidth;
      c.width = Math.round(largura * dpr);
      c.height = Math.round(largura * (A / L) * dpr);
      ctx.setTransform((c.width / L), 0, 0, c.height / A, 0, 0);
      pintar();
    };

    function pintar() {
      ctx!.clearRect(0, 0, L, A);
      desenharManequim(ctx!);
      ctx!.lineCap = "round";
      ctx!.lineJoin = "round";
      for (const f of fios.current) {
        ctx!.strokeStyle = f.cor;
        ctx!.lineWidth = f.largura;
        desenharFio(ctx!, f.pts, f.atual);
      }
      for (const p of pedacos.current) {
        ctx!.save();
        ctx!.globalAlpha = Math.max(0, Math.min(1, p.vida));
        ctx!.translate(p.dx, p.dy);
        ctx!.strokeStyle = p.cor;
        ctx!.lineWidth = p.largura;
        desenharFio(ctx!, p.pts, p.pts.length - 1);
        ctx!.restore();
      }
    }

    function animar() {
      const falta = passoAnimacao(fios.current, pedacos.current, crescendo.current);
      pedacos.current = pedacos.current.filter((p) => p.vida > 0 && p.dy < A + 200);
      crescendo.current = falta;
      pintar();
      quadro.current = falta || pedacos.current.length ? requestAnimationFrame(animar) : 0;
    }

    desenhar.current = () => {
      if (!quadro.current) quadro.current = requestAnimationFrame(animar);
      if (calma) pedacos.current = [];
    };

    ajustar();
    const obs = new ResizeObserver(ajustar);
    obs.observe(c);
    return () => {
      obs.disconnect();
      cancelAnimationFrame(quadro.current);
    };
  }, []);

  function cortar(ax: number, ay: number, bx: number, by: number) {
    if (!cortarFios(fios.current, pedacos.current, ax, ay, bx, by)) return;
    crescendo.current = false;
    desenhar.current();
    const pct = porcentagemCortada(fios.current);
    setCortado((v) => (v === pct ? v : pct));
  }

  function ponto(e: React.PointerEvent<HTMLCanvasElement>): [number, number] {
    const r = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * L, ((e.clientY - r.top) / r.height) * A];
  }

  function mover(e: React.PointerEvent<HTMLCanvasElement>) {
    // no celular corta só com o dedo encostado; no mouse, só de passar
    if (e.pointerType === "touch" && !e.buttons) return;
    const p = ponto(e);
    const a = anterior.current ?? p;
    cortar(a[0], a[1], p[0], p[1]);
    anterior.current = p;
  }

  function crescer() {
    crescendo.current = true;
    pedacos.current = [];
    setCortado(0);
    desenhar.current();
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={tela}
        onPointerMove={mover}
        onPointerDown={(e) => {
          anterior.current = ponto(e);
          mover(e);
        }}
        onPointerLeave={() => (anterior.current = null)}
        onPointerUp={(e) => {
          if (e.pointerType === "touch") anterior.current = null;
        }}
        className="aspect-[360/420] w-full max-w-sm touch-none select-none"
        role="img"
        aria-label="Manequim de cabelo comprido: passe o mouse ou o dedo no cabelo para cortar"
      />
      <div className="flex flex-wrap items-center justify-center gap-3" aria-live="polite">
        <span className="selo selo-cinza tabular-nums">{cortado >= 85 ? "Ficou na régua! ✂" : `Cabelo cortado: ${cortado}%`}</span>
        <button type="button" className="btn btn-pequeno" onClick={crescer} disabled={cortado === 0}>
          Deixar crescer de novo
        </button>
      </div>
    </div>
  );
}
