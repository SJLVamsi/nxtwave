import type {
  AdminAmbassadorRow,
  AdminCollegeRow,
  AdminOverview,
  ChannelRow,
  DailyBrief,
  FlagRow,
  FunnelStep,
  PacingResponse,
  VariantRow,
} from "../../../shared/contracts";

/** `AdminAiUsageSchema` has no exported inferred type in contracts.ts. */
export interface AdminAiUsage {
  callsToday: number;
  byKind: Record<string, number>;
}

export interface AdminCoreData {
  overview: AdminOverview;
  pacing: PacingResponse;
  funnel: FunnelStep[];
  channels: ChannelRow[];
  colleges: AdminCollegeRow[];
  ambassadors: AdminAmbassadorRow[];
  variants: VariantRow[];
  flags: FlagRow[];
  aiUsage: AdminAiUsage;
}

export class AdminApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
    this.code = code;
  }
}

async function parseError(res: Response): Promise<AdminApiError> {
  let code = "INTERNAL";
  let message = `Request failed (${res.status})`;
  try {
    const body = (await res.json()) as { error?: { code?: string; message?: string } };
    if (body.error?.code) code = body.error.code;
    if (body.error?.message) message = body.error.message;
  } catch {
    // Keep the defaults when the body is not the error envelope.
  }
  return new AdminApiError(res.status, code, message);
}

export async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  const res = await fetch(path, { credentials: "same-origin", ...init, headers });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as T;
}

function simQuery(includeSimulated: boolean): string {
  return `?includeSimulated=${includeSimulated ? "true" : "false"}`;
}

export async function fetchAdminCore(includeSimulated: boolean): Promise<AdminCoreData> {
  const q = simQuery(includeSimulated);
  const [overview, pacing, funnel, channels, colleges, ambassadors, variants, flags, aiUsage] =
    await Promise.all([
      adminFetch<AdminOverview>(`/api/admin/overview${q}`),
      adminFetch<PacingResponse>(`/api/admin/pacing${q}`),
      adminFetch<FunnelStep[]>(`/api/admin/funnel${q}`),
      adminFetch<ChannelRow[]>(`/api/admin/channels${q}`),
      adminFetch<AdminCollegeRow[]>(`/api/admin/colleges${q}`),
      adminFetch<AdminAmbassadorRow[]>(`/api/admin/ambassadors${q}`),
      adminFetch<VariantRow[]>(`/api/admin/variants${q}`),
      adminFetch<FlagRow[]>(`/api/admin/flags${q}`),
      adminFetch<AdminAiUsage>(`/api/admin/ai-usage${q}`),
    ]);
  return { overview, pacing, funnel, channels, colleges, ambassadors, variants, flags, aiUsage };
}

export function fetchBrief(includeSimulated: boolean): Promise<DailyBrief> {
  return adminFetch<DailyBrief>(`/api/admin/brief${simQuery(includeSimulated)}`);
}

export async function login(password: string): Promise<void> {
  await adminFetch<{ ok: true }>("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export async function logout(): Promise<void> {
  await adminFetch<{ ok: true }>("/api/admin/logout", { method: "POST" });
}

export interface CreateAmbassadorInput {
  name: string;
  collegeId?: string;
  collegeOther?: string;
  phone?: string;
  email?: string;
}

export function createAmbassador(input: CreateAmbassadorInput): Promise<AdminAmbassadorRow> {
  return adminFetch<AdminAmbassadorRow>("/api/admin/ambassadors", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function decideFlag(userId: string, decision: "approve" | "reject"): Promise<{ ok: true }> {
  return adminFetch<{ ok: true }>(`/api/admin/flags/${encodeURIComponent(userId)}`, {
    method: "POST",
    body: JSON.stringify({ decision }),
  });
}

export async function downloadRegistrationsCsv(includeSimulated: boolean): Promise<void> {
  const res = await fetch(`/api/admin/export.csv${simQuery(includeSimulated)}`, {
    credentials: "same-origin",
  });
  if (!res.ok) throw await parseError(res);
  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition") ?? "";
  const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? "ship60-registrations.csv";
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
