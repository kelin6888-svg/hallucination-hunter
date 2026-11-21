import { useGame } from "../store/useGame";

/**
 * 极简音效：全部由 WebAudio 现场合成，不引入任何音频文件。
 * 用户可随时在顶栏静音，偏好保存在本地。
 */
type Cue = "tick" | "select" | "open" | "stamp";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(
  audio: AudioContext,
  freq: number,
  duration: number,
  gainValue: number,
  type: OscillatorType = "sine",
  startAt = 0,
) {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  const t0 = audio.currentTime + startAt;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(gainValue, t0 + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(audio.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export function playCue(cue: Cue) {
  if (useGame.getState().muted) return;
  const audio = getCtx();
  if (!audio) return;

  switch (cue) {
    case "tick":
      tone(audio, 1180, 0.05, 0.03, "square");
      break;
    case "select":
      tone(audio, 720, 0.09, 0.045, "sine");
      tone(audio, 1080, 0.07, 0.025, "sine", 0.045);
      break;
    case "open":
      tone(audio, 420, 0.14, 0.04, "triangle");
      tone(audio, 630, 0.16, 0.028, "triangle", 0.06);
      break;
    case "stamp":
      tone(audio, 128, 0.22, 0.085, "sine");
      tone(audio, 96, 0.26, 0.05, "triangle", 0.02);
      break;
  }
}
