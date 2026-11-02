"use client";

import { useEffect, useRef, useState } from "react";
import { liberarSom } from "@/lib/somAviso";
import { mudarSomDoManequim, silenciarMaquina, somCabeloCaindo, somCorte, zumbidoMaquina } from "@/lib/somCorte";

/**
 * Brincadeira da página da barbearia: um manequim de cabelo e barba compridos.
 * Onde o mouse (ou o dedo) passa, a "máquina" corta os fios naquele ponto
 * e os pedaços caem. A barba vai por passadas: a 1ª deixa a barba feita
 * (rente), a 2ª tira tudo. Tudo desenhado num <canvas>; nada é salvo.
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
// barba: 2 = grande, 1 = feita (rente), 0 = sem barba
type FioBarba = Fio & { nivel: 0 | 1 | 2; passada: number; feitaEm: number };
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

const CORES_BARBA = ["#2a1a10", "#33200f", "#3d2614", "#24160c", "#4a2f19"];

function criarBarba(): FioBarba[] {
  const barba: FioBarba[] = [];
  let tentativas = 0;
  while (barba.length < 300 && tentativas++ < 5000) {
    // raiz em algum ponto da metade de baixo do rosto
    const x = CAB.x + (Math.random() * 2 - 1) * CAB.rx;
    const y = CAB.y + Math.random() * CAB.ry;
    if (!dentroDoRosto(x, y, 0.97)) continue;
    const rel = Math.abs(x - CAB.x) / CAB.rx;
    // contorno da barba: nas costeletas começa na altura da orelha, no meio logo abaixo do nariz
    if (y < CAB.y + 8 + 32 * (1 - rel * rel)) continue;
    // deixa a boca de fora
    if (Math.abs(x - CAB.x) < 17 && y > CAB.y + 48 && y < CAB.y + 61) continue;
    const bigode = y < CAB.y + 49 && Math.abs(x - CAB.x) < 28;
    const passos = bigode ? 3 : 7;
    const passo = bigode ? 5 : 9 + Math.random() * 2;
    let px = x;
    let py = y;
    let dx = bigode ? Math.sign(x - CAB.x) * 0.5 : -((x - CAB.x) / CAB.rx) * 0.2;
    let dy = 1;
    const pts: [number, number][] = [[px, py]];
    for (let k = 0; k < passos; k++) {
      const n = Math.hypot(dx, dy) || 1;
      px += (dx / n) * passo;
      py += (dy / n) * passo;
      pts.push([px, py]);
      // a barba afina para o queixo
      dx -= ((px - CAB.x) / CAB.rx) * 0.06;
      dy += 0.08;
    }
    barba.push({ pts, atual: passos, total: passos, cor: CORES_BARBA[barba.length % 5], largura: 1.2 + Math.random() * 0.8, nivel: 2, passada: -1, feitaEm: 0 });
  }
  return barba;
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

/** Corta os fios que a máquina tocou (segmento a-b). Devolve quantos fios foram cortados. */
function cortarFios(fios: Fio[], pedacos: Pedaco[], ax: number, ay: number, bx: number, by: number) {
  let mudou = 0;
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
        mudou++;
      }
      break;
    }
  }
  return mudou;
}

/**
 * Passa a máquina na barba. 1ª passada: barba grande vira barba feita.
 * 2ª passada: tira a barba feita. Enquanto a passada ainda está aparando
 * barba grande (podeRaspar = false), ela não raspa a barba feita ao lado:
 * assim dá para fazer a barba toda em várias passadas sem "pelar" o rosto.
 * Devolve se encostou na barba e quantos fios aparou/raspou.
 */
function cortarBarba(barba: FioBarba[], pedacos: Pedaco[], passada: number, podeRaspar: boolean, ax: number, ay: number, bx: number, by: number) {
  let encostou = false;
  let aparados = 0;
  const tocadas: FioBarba[] = [];
  const agora = performance.now();
  for (const f of barba) {
    if (f.nivel === 0) continue;
    // barba grande: qualquer ponto do fio; barba feita: só a raiz (rente à pele)
    const ate = f.nivel === 2 ? Math.floor(f.atual) : 0;
    let tocou = false;
    for (let k = 0; k <= ate && !tocou; k++) tocou = distSeg(f.pts[k][0], f.pts[k][1], ax, ay, bx, by) < RAIO_CORTE + 2;
    if (!tocou) continue;
    encostou = true;
    if (f.passada === passada) continue;
    if (f.nivel === 1) {
      // acabou de ser aparada (ex.: volta do vai-e-vem): ainda não raspa
      if (agora - f.feitaEm > 600) tocadas.push(f);
      continue;
    }
    f.passada = passada;
    const queda = f.pts.slice(0, Math.ceil(f.atual) + 1).map(([x, y]) => [x, y] as [number, number]);
    if (queda.length > 1 && pedacos.length < 400) {
      pedacos.push({ pts: queda, vx: (Math.random() - 0.5) * 1.4, vy: -0.3 - Math.random() * 0.6, dx: 0, dy: 0, giro: 0, vida: 1, cor: f.cor, largura: f.largura });
    }
    f.nivel = 1;
    f.feitaEm = agora;
    f.atual = 0;
    aparados++;
  }
  let raspados = 0;
  if (podeRaspar && aparados === 0) {
    for (const f of tocadas) {
      f.passada = passada;
      f.nivel = 0;
      raspados++;
    }
  }
  return { encostou, aparados, raspados };
}

function desenharBarba(ctx: CanvasRenderingContext2D, barba: FioBarba[]) {
  // barba feita: sombra rente à pele, um pontinho por fio
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(CAB.x, CAB.y, CAB.rx, CAB.ry, 0, 0, Math.PI * 2);
  ctx.clip();
  // um único caminho com todos os círculos: a sombra fica uniforme (sem manchas onde sobrepõe)
  ctx.fillStyle = "rgba(58, 36, 20, 0.32)";
  ctx.beginPath();
  for (const f of barba) {
    if (f.nivel === 0) continue;
    ctx.moveTo(f.pts[0][0] + 7, f.pts[0][1]);
    ctx.arc(f.pts[0][0], f.pts[0][1], 7, 0, Math.PI * 2);
  }
  ctx.fill("nonzero");
  ctx.fillStyle = "rgba(36, 22, 12, 0.45)";
  for (const f of barba) {
    if (f.nivel === 0) continue;
    // pontinhos dos pelos, sempre nos mesmos lugares para não "piscar"
    for (let k = 1; k <= 3; k++) {
      const ox = Math.sin(f.pts[1][0] * k * 7.3) * 4;
      const oy = Math.cos(f.pts[1][1] * k * 5.1) * 4;
      ctx.fillRect(f.pts[0][0] + ox - 0.5, f.pts[0][1] + oy - 0.5, 1, 1);
    }
  }
  ctx.restore();
  // barba grande por cima
  for (const f of barba) {
    if (f.nivel !== 2 || f.atual <= 0) continue;
    ctx.strokeStyle = f.cor;
    ctx.lineWidth = f.largura;
    desenharFio(ctx, f.pts, f.atual);
  }
}

function estadoBarba(barba: FioBarba[]) {
  const n = barba.length || 1;
  const grande = barba.filter((f) => f.nivel === 2).length / n;
  const sem = barba.filter((f) => f.nivel === 0).length / n;
  if (sem > 0.9) return "Barba: tirada";
  if (grande > 0.9) return "Barba: grande";
  if (grande < 0.25 && sem < 0.25) return "Barba: feita";
  return "Barba: aparando…";
}

function porcentagemCortada(fios: Fio[]) {
  const soma = fios.reduce((t, f) => t + f.atual, 0);
  return fios.length ? Math.round((1 - soma / (fios.length * PASSOS)) * 100) : 0;
}

/** Anima os pedaços caindo e o cabelo crescendo. Devolve se ainda tem o que animar. */
function passoAnimacao(fios: Fio[], barba: FioBarba[], pedacos: Pedaco[], crescendo: boolean) {
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
    for (const f of barba) {
      if (f.nivel < 2) {
        f.nivel = 2;
        f.atual = 0;
      }
      if (f.atual < f.total) {
        f.atual = Math.min(f.total, f.atual + 0.2);
        falta = true;
      }
    }
  }
  return falta;
}

export function ManequimCorte() {
  const tela = useRef<HTMLCanvasElement>(null);
  const fios = useRef<Fio[]>([]);
  const barba = useRef<FioBarba[]>([]);
  const pedacos = useRef<Pedaco[]>([]);
  const anterior = useRef<[number, number] | null>(null);
  const direcao = useRef<[number, number] | null>(null);
  const passada = useRef(0);
  const passadaAparou = useRef(-1); // última passada que aparou barba grande
  const quadro = useRef(0);
  const crescendo = useRef(false);
  const desenhar = useRef<() => void>(() => {});
  const [cortado, setCortado] = useState(0);
  const [textoBarba, setTextoBarba] = useState("Barba: grande");
  const [mudo, setMudo] = useState(false);

  useEffect(() => {
    const parar = liberarSom();
    return () => {
      parar();
      silenciarMaquina();
    };
  }, []);

  useEffect(() => {
    const c = tela.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const calma = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    fios.current = criarFios();
    barba.current = criarBarba();

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
      desenharBarba(ctx!, barba.current);
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
      const falta = passoAnimacao(fios.current, barba.current, pedacos.current, crescendo.current);
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
    const antes = pedacos.current.length;
    const cabelo = cortarFios(fios.current, pedacos.current, ax, ay, bx, by);
    const b = cortarBarba(barba.current, pedacos.current, passada.current, passadaAparou.current !== passada.current, ax, ay, bx, by);
    if (b.aparados) passadaAparou.current = passada.current;
    // saiu da barba: a próxima vez que encostar é outra passada
    if (!b.encostou) passada.current++;
    zumbidoMaquina(cabelo > 0 || b.encostou);
    if (!cabelo && !b.aparados && !b.raspados) return;
    somCorte();
    somCabeloCaindo(pedacos.current.length - antes);
    crescendo.current = false;
    desenhar.current();
    const pct = porcentagemCortada(fios.current);
    setCortado((v) => (v === pct ? v : pct));
    const tb = estadoBarba(barba.current);
    setTextoBarba((v) => (v === tb ? v : tb));
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
    // vai-e-volta também conta como nova passada
    const v: [number, number] = [p[0] - a[0], p[1] - a[1]];
    if (Math.hypot(v[0], v[1]) > 1.5) {
      const d = direcao.current;
      if (d && d[0] * v[0] + d[1] * v[1] < 0) passada.current++;
      direcao.current = v;
    }
    cortar(a[0], a[1], p[0], p[1]);
    anterior.current = p;
  }

  function soltar() {
    anterior.current = null;
    direcao.current = null;
    passada.current++;
    silenciarMaquina();
  }

  function crescer() {
    crescendo.current = true;
    pedacos.current = [];
    setCortado(0);
    setTextoBarba("Barba: grande");
    desenhar.current();
  }

  function alternarSom() {
    mudarSomDoManequim(!mudo);
    setMudo(!mudo);
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
        onPointerLeave={soltar}
        onPointerUp={(e) => {
          if (e.pointerType === "touch") soltar();
        }}
        className="aspect-[360/420] w-full max-w-sm touch-none select-none"
        role="img"
        aria-label="Manequim de cabelo e barba compridos: passe o mouse ou o dedo para cortar"
      />
      <div className="flex flex-wrap items-center justify-center gap-2" aria-live="polite">
        <span className="selo selo-cinza tabular-nums">{cortado >= 85 ? "Ficou na régua! ✂" : `Cabelo cortado: ${cortado}%`}</span>
        <span className="selo selo-cinza">{textoBarba}</span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button type="button" className="btn btn-pequeno" onClick={crescer} disabled={cortado === 0 && textoBarba === "Barba: grande"}>
          Deixar crescer de novo
        </button>
        <button type="button" className="btn btn-pequeno" onClick={alternarSom} aria-pressed={!mudo}>
          {mudo ? "🔇 Sem som" : "🔊 Som ligado"}
        </button>
      </div>
    </div>
  );
}
