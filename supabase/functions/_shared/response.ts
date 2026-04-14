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
