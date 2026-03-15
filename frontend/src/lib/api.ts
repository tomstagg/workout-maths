const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

// Typed API calls
export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  total_points: number;
  created_at: string;
  selected_tables: number[];
}

export interface UserStats {
  total_points: number;
  quiz_count: number;
  selected_tables: number[];
}

export interface AnswerSubmit {
  table_number: number;
  multiplier: number;
  selected_answer: number;
  answered_at: string;
}

export interface QuizSubmitRequest {
  started_at: string;
  duration_seconds: number;
  answers: AnswerSubmit[];
}

export interface AnswerResult {
  position: number;
  table_number: number;
  multiplier: number;
  correct_answer: number;
  selected_answer: number;
  is_correct: boolean;
  answered_at: string;
}

export interface QuizSessionResponse {
  id: string;
  table_numbers: number[];
  started_at: string;
  completed_at: string;
  total_questions: number;
  correct_count: number;
  duration_seconds: number;
  base_points: number;
  streak_bonus_points: number;
  total_points_earned: number;
  max_streak: number;
  answers: AnswerResult[];
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  display_name: string;
  total_points: number;
  quiz_count: number;
}

export interface AllowedUsernameResponse {
  id: string;
  username: string;
  created_at: string;
}
