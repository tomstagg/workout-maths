import { describe, it, expect } from "vitest";
import {
  generateQuestions,
  getStreakBadge,
  STREAK_THRESHOLDS,
} from "../quiz";

describe("generateQuestions", () => {
  it("returns exactly 10 questions for a valid table list", () => {
    const questions = generateQuestions([2, 5, 7]);
    expect(questions).toHaveLength(10);
  });

  it("returns empty array for empty table list", () => {
    expect(generateQuestions([])).toEqual([]);
  });

  it("each question has correctAnswer equal to table × multiplier", () => {
    const questions = generateQuestions([3, 4]);
    for (const q of questions) {
      expect(q.correctAnswer).toBe(q.table * q.multiplier);
    }
  });

  it("each question has exactly 5 options", () => {
    const questions = generateQuestions([6]);
    for (const q of questions) {
      expect(q.options).toHaveLength(5);
    }
  });

  it("correctAnswer is always present in options", () => {
    const questions = generateQuestions([2, 3, 5, 7, 9]);
    for (const q of questions) {
      expect(q.options).toContain(q.correctAnswer);
    }
  });

  it("options have no duplicate values", () => {
    const questions = generateQuestions([2]);
    for (const q of questions) {
      const unique = new Set(q.options);
      expect(unique.size).toBe(q.options.length);
    }
  });

  it("all options are positive integers", () => {
    const questions = generateQuestions([5, 11]);
    for (const q of questions) {
      for (const opt of q.options) {
        expect(opt).toBeGreaterThan(0);
        expect(Number.isInteger(opt)).toBe(true);
      }
    }
  });
});

describe("getStreakBadge", () => {
  it("returns null for streak below 3", () => {
    expect(getStreakBadge(0)).toBeNull();
    expect(getStreakBadge(1)).toBeNull();
    expect(getStreakBadge(2)).toBeNull();
  });

  it("returns soft streak badge at streak 3", () => {
    const badge = getStreakBadge(3);
    expect(badge).not.toBeNull();
    expect(badge!.streak).toBe(STREAK_THRESHOLDS[0].streak);
    expect(badge!.emoji).toBe("🔥");
  });

  it("returns medium streak badge at streak 5", () => {
    const badge = getStreakBadge(5);
    expect(badge).not.toBeNull();
    expect(badge!.streak).toBe(STREAK_THRESHOLDS[1].streak);
  });

  it("returns hard streak badge at streak 10", () => {
    const badge = getStreakBadge(10);
    expect(badge).not.toBeNull();
    expect(badge!.streak).toBe(STREAK_THRESHOLDS[2].streak);
    expect(badge!.emoji).toBe("🔥🔥🔥");
  });

  it("returns hard streak badge for streaks above 10", () => {
    const badge = getStreakBadge(15);
    expect(badge).not.toBeNull();
    expect(badge!.streak).toBe(STREAK_THRESHOLDS[2].streak);
  });
});
