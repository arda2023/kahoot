import type { Phase, Ranking, Quiz } from "@quiz/contracts";
export function points(
  correct: boolean,
  elapsedMs: number,
  durationMs: number,
): number {
  if (
    !Number.isFinite(elapsedMs) ||
    !Number.isFinite(durationMs) ||
    durationMs <= 0 ||
    elapsedMs < 0 ||
    elapsedMs >= durationMs
  )
    return 0;
  return correct ? Math.round(1000 * (1 - elapsedMs / durationMs / 2)) : 0;
}
export function rank(players: Omit<Ranking, "rank">[]): Ranking[] {
  const sorted = [...players].sort(
    (a, b) =>
      b.score - a.score ||
      a.name.localeCompare(b.name) ||
      a.id.localeCompare(b.id),
  );
  return sorted.map((p) => ({
    ...p,
    rank: sorted.findIndex((x) => x.score === p.score) + 1,
  }));
}
export function nextPhase(phase: Phase, index: number, count: number): Phase {
  if (phase === "lobby" || phase === "leaderboard")
    return index + 1 < count ? "question" : "finished";
  if (phase === "reveal") return "leaderboard";
  throw new Error("Dieser Übergang ist nicht erlaubt.");
}
export const seedQuiz: Quiz = {
  title: "Wissen zum Warmwerden",
  questions: [
    {
      id: "seed-1",
      type: "single",
      text: "Wie viele Seiten hat ein Sechseck?",
      options: ["Vier", "Fünf", "Sechs", "Acht"],
      correctIndex: 2,
      durationSeconds: 15,
    },
    {
      id: "seed-2",
      type: "boolean",
      text: "Ein Kilogramm entspricht 1000 Gramm.",
      options: ["Wahr", "Falsch"],
      correctIndex: 0,
      durationSeconds: 15,
    },
    {
      id: "seed-3",
      type: "single",
      text: "Welcher Planet ist der Sonne am nächsten?",
      options: ["Erde", "Mars", "Venus", "Merkur"],
      correctIndex: 3,
      durationSeconds: 15,
    },
  ],
};
