import { ERROR_CODES, ERROR_STATUS, type ErrorCode } from "../../shared/errors";

export function json(data: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  if (!headers.has("content-type")) headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function apiError(code: ErrorCode, message?: string, extraHeaders?: HeadersInit): Response {
  const headers = new Headers(extraHeaders);
  return json(
    { error: { code, message: message ?? defaultMessage(code) } },
    { status: ERROR_STATUS[code], headers },
  );
}

function defaultMessage(code: ErrorCode): string {
  switch (code) {
    case ERROR_CODES.DUPLICATE:
      return "You are already registered.";
    case ERROR_CODES.INVALID_INPUT:
      return "Some details look incorrect. Please check and try again.";
    case ERROR_CODES.RATE_LIMITED:
      return "Too many attempts. Please try again later.";
    case ERROR_CODES.TURNSTILE_FAILED:
      return "We could not verify you are human. Please refresh and try again.";
    case ERROR_CODES.UNAUTHORIZED:
      return "Please register or log in first.";
    case ERROR_CODES.FORBIDDEN:
      return "You do not have access to this.";
    case ERROR_CODES.NOT_FOUND:
      return "Not found.";
    case ERROR_CODES.CONFLICT:
      return "That conflicts with an existing record.";
    case ERROR_CODES.AI_UNAVAILABLE:
      return "The AI helper is busy right now.";
    case ERROR_CODES.EVALUATION_UNAVAILABLE:
      return "Evaluation unavailable — saved for manual review.";
    default:
      return "Something went wrong on our side.";
  }
}

type ParseResult<T> = { ok: true; data: T } | { ok: false; response: Response };

export async function parseJsonBody<T>(
  request: Request,
  schema: { safeParse: (input: unknown) => { success: true; data: T } | { success: false; error: { issues: { message: string }[] } } },
): Promise<ParseResult<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: apiError(ERROR_CODES.INVALID_INPUT, "Expected a JSON body.") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Invalid input.";
    return { ok: false, response: apiError(ERROR_CODES.INVALID_INPUT, first) };
  }
  return { ok: true, data: parsed.data };
}

export function securityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("x-frame-options", "DENY");
  headers.set(
    "permissions-policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  if (!headers.has("content-security-policy")) {
    headers.set(
      "content-security-policy",
      [
        "default-src 'self'",
        "script-src 'self' https://challenges.cloudflare.com",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "connect-src 'self' https://challenges.cloudflare.com",
        "frame-src https://challenges.cloudflare.com",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; "),
    );
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function html(body: string, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  return new Response(body, { ...init, headers });
}
