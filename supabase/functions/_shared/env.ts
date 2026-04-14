export function getEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function getOptionalEnv(name: string): string {
  return Deno.env.get(name)?.trim() ?? "";
}

export function getNumberEnv(name: string, fallback: number): number {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getBooleanEnv(name: string, fallback: boolean): boolean {
  const value = Deno.env.get(name)?.trim().toLowerCase();
  if (!value) {
    return fallback;
  }

  if (value === "true" || value === "1" || value === "yes" || value === "on") {
    return true;
  }

  if (value === "false" || value === "0" || value === "no" || value === "off") {
    return false;
  }

  return fallback;
}
