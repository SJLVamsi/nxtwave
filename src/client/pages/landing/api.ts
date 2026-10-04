import type {
  CollegeOption,
  IdeaCard,
  IdeaPreviewRequest,
  RegisterRequest,
  RegisterResponse,
  StatsPublicResponse,
} from "../../../shared/contracts";

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly body: unknown;

  constructor(code: string, message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.body = body;
  }
}

interface ErrorEnvelope {
  error?: { code?: string; message?: string };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Non-JSON response; the status decides.
  }
  if (!response.ok) {
    const envelope = body as ErrorEnvelope | null;
    throw new ApiError(
      envelope?.error?.code ?? "INTERNAL",
      envelope?.error?.message ?? "Something went wrong. Please try again.",
      response.status,
      body,
    );
  }
  return body as T;
}

function post<T>(path: string, payload: unknown, signal?: AbortSignal): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
}

export async function fetchIdea(
  payload: IdeaPreviewRequest,
  signal?: AbortSignal,
): Promise<IdeaCard> {
  const data = await post<{ idea: IdeaCard }>("/api/ideas/preview", payload, signal);
  return data.idea;
}

export function fetchStats(): Promise<StatsPublicResponse> {
  return request<StatsPublicResponse>("/api/stats/public");
}

/**
 * `GET /api/colleges?q=` has no wrapper schema in contracts.ts; accept either a
 * bare array or `{ colleges: [...] }` and normalise here.
 */
export async function fetchColleges(
  query: string,
  signal?: AbortSignal,
): Promise<CollegeOption[]> {
  const data = await request<CollegeOption[] | { colleges?: CollegeOption[] }>(
    `/api/colleges?q=${encodeURIComponent(query)}`,
    { signal },
  );
  if (Array.isArray(data)) return data;
  return data.colleges ?? [];
}

export function register(
  payload: RegisterRequest,
  signal?: AbortSignal,
): Promise<RegisterResponse> {
  return post<RegisterResponse>("/api/register", payload, signal);
}
