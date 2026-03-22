let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    ctx = new AudioContext();
  }
  if (ctx.state === "suspended") {
    ctx.resume();
  }
  return ctx;
}

export function playCorrect(): void {
  const context = getCtx();
  if (!context) return;
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.connect(gain);
  gain.connect(context.destination);
  osc.type = "sine";
  const now = context.currentTime;
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.linearRampToValueAtTime(900, now + 0.2);
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.linearRampToValueAtTime(0, now + 0.2);
  osc.start(now);
  osc.stop(now + 0.2);
}

export function playWrong(): void {
  const context = getCtx();
  if (!context) return;
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.connect(gain);
  gain.connect(context.destination);
  osc.type = "triangle";
  const now = context.currentTime;
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.linearRampToValueAtTime(140, now + 0.2);
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.linearRampToValueAtTime(0, now + 0.2);
  osc.start(now);
  osc.stop(now + 0.2);
}

function playNote(
  context: AudioContext,
  frequency: number,
  startTime: number,
  duration: number
): void {
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.connect(gain);
  gain.connect(context.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0.3, startTime);
  gain.gain.linearRampToValueAtTime(0, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

// C5=523, E5=659, G5=784, C6=1047, E6=1319
export function playFanfarePerfect(): void {
  const context = getCtx();
  if (!context) return;
  const now = context.currentTime;
  const notes = [523, 659, 784, 1047, 1319];
  const noteDuration = 0.26;
  notes.forEach((freq, i) => {
    playNote(context, freq, now + i * noteDuration, noteDuration);
  });
}

// C5=523, E5=659, G5=784
export function playFanfareShort(): void {
  const context = getCtx();
  if (!context) return;
  const now = context.currentTime;
  const notes = [523, 659, 784];
  const noteDuration = 0.23;
  notes.forEach((freq, i) => {
    playNote(context, freq, now + i * noteDuration, noteDuration);
  });
}
