import { corsHeaders } from "./cors.ts";

export function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders,
      ...headers,
    },
  });
}

export function errorResponse(
  message: string,
  status = 400,
  code = "bad_request",
  details?: unknown,
  headers: Record<string, string> = {},
): Response {
  return jsonResponse(
    {
      error: {
        code,
        message,
        details: details ?? null,
      },
    },
    status,
    headers,
  );
}

export async function readJson<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}

export function errorMessage(
  error: unknown,
  fallback: string,
): string {
  if (error instanceof Error) {
    const message = error.message.trim();
    return message || fallback;
  }

  if (error && typeof error === "object") {
    const payload = error as Record<string, unknown>;
    const message = typeof payload.message === "string"
      ? payload.message.trim()
      : "";
    if (message) {
      return message;
    }

    const details = typeof payload.details === "string"
      ? payload.details.trim()
      : "";
    if (details) {
      return details;
    }

    const hint = typeof payload.hint === "string" ? payload.hint.trim() : "";
    if (hint) {
      return hint;
    }

    const code = typeof payload.code === "string" ? payload.code.trim() : "";
    if (code) {
      return code;
    }
  }

  return fallback;
}
