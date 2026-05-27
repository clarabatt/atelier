import { api } from '@/lib/api';

export interface Topic {
  id: string;
  title: string;
  domain: string;
  accuracy_pct: number;
  last_activity_at: string | null;
  created_at: string;
}

export async function fetchTopics(): Promise<Topic[]> {
  const { data } = await api.get<{ topics: Topic[] }>('/api/topics');
  return data.topics;
}
