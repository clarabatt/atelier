import { api } from '@/lib/api';

export interface SessionQuestion {
  id: string;
  body: string;
  format: 'mcq' | 'written' | 'fill_blank';
  options: string[] | null;
  correct_answer: string;
  difficulty: number;
  position: number;
  answered: boolean;
}

export interface SessionData {
  session_id: string;
  questions: SessionQuestion[];
  correct_count: number;
  wrong_count: number;
  skipped_count: number;
}

export interface SessionResult {
  correct: number;
  wrong: number;
  skipped: number;
  accuracy_pct: number;
}

export async function startSession(topicId: string): Promise<SessionData> {
  const { data } = await api.post<SessionData>('/api/sessions', { topic_id: topicId });
  return data;
}

export async function recordAttempt(
  sessionId: string,
  questionId: string,
  userAnswer: string,
  status: 'correct' | 'wrong' | 'skipped',
): Promise<string> {
  const { data } = await api.post<{ attempt_id: string }>(`/api/sessions/${sessionId}/attempts`, {
    question_id: questionId,
    user_answer: userAnswer,
    status,
  });
  return data.attempt_id;
}

export async function completeSession(sessionId: string): Promise<SessionResult> {
  const { data } = await api.post<SessionResult>(`/api/sessions/${sessionId}/complete`);
  return data;
}

export interface AiCheckResult {
  verdict: 'confirmed' | 'overridden';
  explanation: string;
}

export async function requestAiCheck(
  sessionId: string,
  attemptId: string,
): Promise<AiCheckResult> {
  const { data } = await api.post<AiCheckResult>(
    `/api/sessions/${sessionId}/attempts/${attemptId}/ai-check`,
  );
  return data;
}
