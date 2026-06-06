import { api } from "@/lib/api";

export enum TopicStatus {
  NotStarted = "not_started",
  Active = "active",
  Archived = "archived",
}

export interface Topic {
  id: string;
  title: string;
  domain: string;
  status: TopicStatus;
  accuracy_pct: number;
  last_activity_at: string | null;
  created_at: string;
}

export async function fetchTopics(includeArchived = false): Promise<Topic[]> {
  const { data } = await api.get<{ topics: Topic[] }>("/api/topics", {
    params: includeArchived ? { include_archived: true } : undefined,
  });
  return data.topics;
}

export async function archiveTopic(
  id: string,
  status: TopicStatus,
): Promise<void> {
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
  await api.post(`/api/topics/${topicId}/batches`, undefined, {
    timeout: 120_000,
  });
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

export enum TopicLevel {
  Beginner = "beginner",
  Intermediate = "intermediate",
  Advanced = "advanced",
}

export enum QuestionFormat {
  Mcq = "mcq",
  Written = "written",
  FillBlank = "fill_blank",
}

export async function createTopic(
  title: string,
  domain: string,
  initial_level?: TopicLevel,
  question_formats?: QuestionFormat[],
): Promise<NewTopic> {
  const { data } = await api.post<{ topic: NewTopic }>(
    "/api/topics",
    {
      title,
      domain,
      ...(initial_level ? { initial_level } : {}),
      ...(question_formats ? { question_formats } : {}),
    },
    { timeout: initial_level ? 120_000 : 10_000 },
  );
  return data.topic;
}

export enum DiagnosticRole {
  User = "user",
  Assistant = "assistant",
}

export interface DiagnosticMessage {
  role: DiagnosticRole;
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
