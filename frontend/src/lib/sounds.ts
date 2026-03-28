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

// Correct A: bright E major arpeggio — E5, G#5, B5
function playCorrectA(context: AudioContext): void {
  const now = context.currentTime;
  [659, 831, 988].forEach((f, i) =>
    playNote(context, f, now + i * 0.12, 0.18)
  );
}

// Correct B: rising fourth then octave — C5, G5, C6
function playCorrectB(context: AudioContext): void {
  const now = context.currentTime;
  [523, 784, 1047].forEach((f, i) =>
    playNote(context, f, now + i * 0.13, 0.2)
  );
}

export function playCorrect(): void {
  const context = getCtx();
  if (!context) return;
  if (Math.random() < 0.5) playCorrectA(context);
  else playCorrectB(context);
}

// Wrong A: wah-wah descend — Bb3, G3
function playWrongA(context: AudioContext): void {
  const now = context.currentTime;
  [233, 196].forEach((f, i) =>
    playNote(context, f, now + i * 0.22, 0.28, "triangle", 0.25)
  );
}

// Wrong B: three-step sad drop — G3, E3, C3
function playWrongB(context: AudioContext): void {
  const now = context.currentTime;
  [196, 165, 131].forEach((f, i) =>
    playNote(context, f, now + i * 0.16, 0.22, "triangle", 0.25)
  );
}

export function playWrong(): void {
  const context = getCtx();
  if (!context) return;
  if (Math.random() < 0.5) playWrongA(context);
  else playWrongB(context);
}

function playNote(
  context: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.3
): void {
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.connect(gain);
  gain.connect(context.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(volume, startTime);
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
