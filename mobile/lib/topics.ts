import { api } from '@/lib/api';

export interface Topic {
  id: string;
  title: string;
  domain: string;
  status: 'active' | 'archived';
  accuracy_pct: number;
  last_activity_at: string | null;
  created_at: string;
}

export async function fetchTopics(includeArchived = false): Promise<Topic[]> {
  const { data } = await api.get<{ topics: Topic[] }>('/api/topics', {
    params: includeArchived ? { include_archived: true } : undefined,
  });
  return data.topics;
}

export async function archiveTopic(id: string, status: 'active' | 'archived'): Promise<void> {
  await api.patch(`/api/topics/${id}`, { status });
}

export async function deleteTopic(id: string): Promise<void> {
  await api.delete(`/api/topics/${id}`);
}

export interface TopicDetail {
  id: string;
  title: string;
  domain: string;
  ai_level_summary: string | null;
  has_batch: boolean;
  accuracy_pct: number;
  last_activity_at: string | null;
  created_at: string;
}

export async function generateBatch(topicId: string): Promise<void> {
  await api.post(`/api/topics/${topicId}/batches`, undefined, { timeout: 120_000 });
}

export async function fetchTopic(id: string): Promise<TopicDetail> {
  const { data } = await api.get<{ topic: TopicDetail }>(`/api/topics/${id}`);
  return data.topic;
}

export interface NewTopic {
  id: string;
  title: string;
  domain: string;
  ai_level_summary: string | null;
  created_at: string;
}

export type TopicLevel = 'beginner' | 'intermediate' | 'advanced';

export async function createTopic(
  title: string,
  domain: string,
  initial_level?: TopicLevel,
): Promise<NewTopic> {
  const { data } = await api.post<{ topic: NewTopic }>('/api/topics', {
    title,
    domain,
    ...(initial_level ? { initial_level } : {}),
  }, { timeout: initial_level ? 120_000 : 10_000 });
  return data.topic;
}

export interface DiagnosticMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface DiagnosticResponse {
  message: string;
  is_final: boolean;
}

export async function runDiagnostic(
  topicId: string,
  conversation: DiagnosticMessage[],
): Promise<DiagnosticResponse> {
  const { data } = await api.post<DiagnosticResponse>(
    `/api/topics/${topicId}/diagnostic`,
    { conversation },
    { timeout: 60_000 },
  );
  return data;
}
