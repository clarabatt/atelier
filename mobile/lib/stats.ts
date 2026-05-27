import { api } from '@/lib/api';

export interface TopicStatRow {
  id: string;
  title: string;
  domain: string;
  accuracy_pct: number;
  total_answered: number;
  total_skipped: number;
  last_activity_at: string | null;
}

export interface UserStats {
  total_topics: number;
  overall_accuracy: number;
  current_streak: number;
  total_answered: number;
  topics: TopicStatRow[];
}

export interface BatchHistoryRow {
  batch_number: number;
  date: string;
  questions_answered: number;
  accuracy_pct: number;
  passed: boolean;
}

export interface SessionPoint {
  batch_number: number;
  ended_at: string;
  accuracy_pct: number;
}

export interface WeakSpot {
  id: string;
  body: string;
  correct_answer: string;
  reasoning: string;
}

export interface CurrentBatchProgress {
  batch_number: number;
  total_questions: number;
  correct: number;
  wrong: number;
  skipped: number;
}

export interface TopicDetailStats {
  batch_history: BatchHistoryRow[];
  session_history: SessionPoint[];
  weak_spots: WeakSpot[];
  current_batch: CurrentBatchProgress | null;
}

export async function fetchUserStats(): Promise<UserStats> {
  const { data } = await api.get<UserStats>('/api/stats');
  return data;
}

export async function fetchTopicDetailStats(topicId: string): Promise<TopicDetailStats> {
  const { data } = await api.get<TopicDetailStats>(`/api/stats/topics/${topicId}`);
  return data;
}
