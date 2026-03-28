export interface Question {
  table: number;
  multiplier: number;
  correctAnswer: number;
  options: number[];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateDistractors(table: number, multiplier: number, correct: number): number[] {
  const distractors = new Set<number>();

  // Nearby multipliers of the same table (±1, ±2)
  for (const delta of [-2, -1, 1, 2]) {
    const m = multiplier + delta;
    if (m >= 1 && m <= 12) {
      const val = table * m;
      if (val !== correct && val > 0) distractors.add(val);
    }
  }

  // Neighbouring table results (±1 table, same multiplier)
  for (const tDelta of [-1, 1]) {
    const t = table + tDelta;
    if (t >= 2 && t <= 12) {
      const val = t * multiplier;
      if (val !== correct && val > 0) distractors.add(val);
    }
  }

  // Small offsets from correct answer
  for (const offset of [-3, -2, 2, 3]) {
    const val = correct + offset;
    if (val !== correct && val > 0) distractors.add(val);
  }

  const arr = shuffle([...distractors].filter((v) => v !== correct));
  return arr.slice(0, 5);
}

export function generateQuestions(selectedTables: number[]): Question[] {
  if (selectedTables.length === 0) return [];

  const questions: Question[] = [];
  const tables = shuffle([...selectedTables]);

  for (let i = 0; i < 10; i++) {
    const table = tables[i % tables.length];
    const multiplier = Math.floor(Math.random() * 12) + 1;
    const correctAnswer = table * multiplier;
    const distractors = generateDistractors(table, multiplier, correctAnswer);

    // Ensure exactly 5 distractors (pad with random if needed)
    while (distractors.length < 5) {
      const val = correctAnswer + (distractors.length + 1) * 5;
      if (!distractors.includes(val)) distractors.push(val);
    }

    const options = shuffle([correctAnswer, ...distractors.slice(0, 5)]);

    questions.push({ table, multiplier, correctAnswer, options });
  }

  return questions;
}

export const STREAK_THRESHOLDS = [
  { streak: 3, bonus: 5, label: "Soft Streak", emoji: "🔥" },
  { streak: 5, bonus: 10, label: "Medium Streak", emoji: "🔥🔥" },
  { streak: 10, bonus: 25, label: "Perfect Streak", emoji: "🔥🔥🔥" },
];

export function getStreakBadge(streak: number): (typeof STREAK_THRESHOLDS)[0] | null {
  for (let i = STREAK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (streak >= STREAK_THRESHOLDS[i].streak) return STREAK_THRESHOLDS[i];
  }
  return null;
}
