import type { TipoAviso } from "./avisos";

/**
 * Sons dos avisos, gerados na hora com Web Audio (sem arquivo para baixar).
 * O navegador só libera o som depois de um toque/clique na página:
 * liberarSom() fica escutando o primeiro e destrava o áudio.
 * O mudo fica salvo neste aparelho (localStorage "avisos-mudo").
 */
let ctx: AudioContext | null = null;

function contexto() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

export function liberarSom() {
  const destravar = () => {
    void contexto()?.resume().catch(() => {});
  };
  window.addEventListener("pointerdown", destravar, { once: true, passive: true });
  window.addEventListener("keydown", destravar, { once: true });
  return () => {
    window.removeEventListener("pointerdown", destravar);
    window.removeEventListener("keydown", destravar);
  };
}

export function somMudo() {
  try {
    return localStorage.getItem("avisos-mudo") === "1";
  } catch {
    return false;
  }
}
export function mudarSom(mudo: boolean) {
  try {
    localStorage.setItem("avisos-mudo", mudo ? "1" : "0");
  } catch {
    // armazenamento bloqueado: vale só nesta página
  }
}

// [frequência Hz, início s, duração s]
const MELODIAS: Record<TipoAviso, [number, number, number][]> = {
  marcou: [[784, 0, 0.18], [1047, 0.12, 0.35]], // sol → dó, subindo (boa notícia)
  confirmou: [[1047, 0, 0.12], [1319, 0.09, 0.3]],
  remarcou: [[880, 0, 0.16], [880, 0.16, 0.25]],
  desmarcou: [[659, 0, 0.18], [440, 0.14, 0.4]], // descendo
};

export function tocarAviso(tipo: TipoAviso) {
  if (somMudo()) return;
  const c = contexto();
  if (!c || c.state !== "running") return; // ainda sem toque na página: fica só o aviso visual
  const agora = c.currentTime + 0.02;
  const saida = c.createGain();
  saida.gain.value = 0.18;
  saida.connect(c.destination);
  for (const [freq, ini, dur] of MELODIAS[tipo]) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    // "sininho": ataque rápido e queda suave
    g.gain.setValueAtTime(0, agora + ini);
    g.gain.linearRampToValueAtTime(1, agora + ini + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, agora + ini + dur);
    o.connect(g).connect(saida);
    o.start(agora + ini);
    o.stop(agora + ini + dur + 0.05);
  }
}
