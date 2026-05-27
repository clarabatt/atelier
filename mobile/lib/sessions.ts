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
): Promise<void> {
  await api.post(`/api/sessions/${sessionId}/attempts`, {
    question_id: questionId,
    user_answer: userAnswer,
    status,
  });
}

export async function completeSession(sessionId: string): Promise<SessionResult> {
  const { data } = await api.post<SessionResult>(`/api/sessions/${sessionId}/complete`);
  return data;
}
