export type Phase =
  "lobby" | "question" | "reveal" | "leaderboard" | "finished";
export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  durationSeconds: number;
  type: "single" | "boolean";
  image?: string;
}
export interface Quiz {
  title: string;
  questions: Question[];
}
export interface Ranking {
  id: string;
  name: string;
  score: number;
  rank: number;
}
export interface Snapshot {
  id: string;
  pin: string;
  title: string;
  phase: Phase;
  version: number;
  questionIndex: number;
  questionCount: number;
  deadline: number | null;
  serverNow: number;
  question: Omit<Question, "correctIndex"> | null;
  correctIndex?: number;
  players: Ranking[];
  answeredCount: number;
  myAnswer?: number;
  myPoints?: number;
  locked: boolean;
  role: "host" | "player";
}
export interface Credentials {
  roomId: string;
  token: string;
  role: "host" | "player";
  pin: string;
}
export type Reply<T = unknown> =
  { ok: true; data: T } | { ok: false; error: string };
export interface Report {
  title: string;
  players: Ranking[];
  questions: {
    text: string;
    correctAnswer: string;
    answered: number;
    correct: number;
    distribution: number[];
  }[];
  rows: {
    name: string;
    question: string;
    answer: string;
    correct: boolean;
    points: number;
  }[];
}
