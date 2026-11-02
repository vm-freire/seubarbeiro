import { contexto } from "./somAviso";

/**
 * Sons do manequim da página da barbearia, gerados com Web Audio (sem arquivo):
 * o zumbido da máquina enquanto ela passa, o "tec" do corte e o chiado do
 * cabelo caindo. O navegador só deixa tocar depois de algum clique/toque na
 * página; antes disso tudo fica mudo, sem erro.
 */

let ruido: AudioBuffer | null = null;
let motor: { volume: GainNode; filtro: BiquadFilterNode } | null = null;
let desligar = 0;
let ultimoCorte = 0;
let ultimaQueda = 0;
let mudo = false;

export function somDoManequimMudo() {
  return mudo;
}

export function mudarSomDoManequim(valor: boolean) {
  mudo = valor;
  if (valor) silenciarMaquina();
}

function pronto() {
  if (mudo || typeof window === "undefined") return null;
  // sem nenhum clique na página o navegador bloqueia o áudio: nem tenta
  const ativacao = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
  if (ativacao && !ativacao.hasBeenActive) return null;
  const c = contexto();
  if (!c) return null;
  if (c.state === "suspended") void c.resume().catch(() => {});
  return c.state === "running" ? c : null;
}

function bufferRuido(c: AudioContext) {
  if (!ruido || ruido.sampleRate !== c.sampleRate) {
    ruido = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = ruido.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return ruido;
}

/** Zumbido da máquina: liga ao mexer e desliga sozinho quando o mouse para. */
export function zumbidoMaquina(cortando: boolean) {
  const c = pronto();
  if (!c) return;
  if (!motor) {
    const volume = c.createGain();
    volume.gain.value = 0;
    const filtro = c.createBiquadFilter();
    filtro.type = "lowpass";
    filtro.frequency.value = 1500;
    filtro.Q.value = 2;
    const grave = c.createOscillator();
    grave.type = "sawtooth";
    grave.frequency.value = 118;
    const agudo = c.createOscillator();
    agudo.type = "square";
    agudo.frequency.value = 236.5;
    const meio = c.createGain();
    meio.gain.value = 0.3;
    // a lâmina vibrando: o volume "treme" 60 vezes por segundo
    const tremor = c.createGain();
    tremor.gain.value = 0.7;
    const lfo = c.createOscillator();
    lfo.frequency.value = 60;
    const lfoVolume = c.createGain();
    lfoVolume.gain.value = 0.3;
    lfo.connect(lfoVolume).connect(tremor.gain);
    grave.connect(filtro);
    agudo.connect(meio).connect(filtro);
    filtro.connect(tremor).connect(volume).connect(c.destination);
    grave.start();
    agudo.start();
    lfo.start();
    motor = { volume, filtro };
  }
  const t = c.currentTime;
  // cortando, a máquina "pesa": som mais abafado e um pouco mais alto
  motor.volume.gain.setTargetAtTime(cortando ? 0.075 : 0.045, t, 0.03);
  motor.filtro.frequency.setTargetAtTime(cortando ? 1000 : 1600, t, 0.04);
  window.clearTimeout(desligar);
  desligar = window.setTimeout(silenciarMaquina, 150);
}

export function silenciarMaquina() {
  window.clearTimeout(desligar);
  const c = contexto();
  if (c && motor) motor.volume.gain.setTargetAtTime(0, c.currentTime, 0.05);
}

/** "Tec" curto de fio sendo cortado. */
export function somCorte() {
  const c = pronto();
  if (!c) return;
  const agora = performance.now();
  if (agora - ultimoCorte < 70) return;
  ultimoCorte = agora;
  const t = c.currentTime;
  const fonte = c.createBufferSource();
  fonte.buffer = bufferRuido(c);
  const filtro = c.createBiquadFilter();
  filtro.type = "highpass";
  filtro.frequency.value = 2600 + Math.random() * 1200;
  const g = c.createGain();
  g.gain.setValueAtTime(0.13, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  fonte.connect(filtro).connect(g).connect(c.destination);
  fonte.start(t, Math.random() * 0.8, 0.07);
}

/** Chiado suave dos fios caindo (mais forte quando cai mais cabelo). */
export function somCabeloCaindo(pedacos: number) {
  const c = pronto();
  if (!c || pedacos <= 0) return;
  const agora = performance.now();
  if (agora - ultimaQueda < 220) return;
  ultimaQueda = agora;
  const t = c.currentTime;
  const fonte = c.createBufferSource();
  fonte.buffer = bufferRuido(c);
  const filtro = c.createBiquadFilter();
  filtro.type = "lowpass";
  filtro.frequency.setValueAtTime(1100, t);
  filtro.frequency.exponentialRampToValueAtTime(250, t + 0.5);
  const g = c.createGain();
  const pico = 0.035 + 0.045 * Math.min(1, pedacos / 8);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(pico, t + 0.06);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
  fonte.connect(filtro).connect(g).connect(c.destination);
  fonte.start(t, Math.random() * 0.4, 0.6);
}
