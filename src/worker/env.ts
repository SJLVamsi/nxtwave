/**
 * App bindings. `Env` comes from the generated worker-configuration.d.ts
 * (run `npm run cf-typegen` after changing wrangler.jsonc).
 * Secrets are optional at the type level so local dev works without them.
 */
export interface AppEnv extends Env {
  ADMIN_PASSWORD?: string;
  SESSION_SECRET?: string;
  TURNSTILE_SECRET_KEY?: string;
  RESEND_API_KEY?: string;
  GITHUB_TOKEN?: string;
}

export interface AppVariables {
  requestId: string;
}

export type AppContext = { Bindings: AppEnv; Variables: AppVariables };

export function requireSecret(env: AppEnv, key: keyof AppEnv): string {
  const value = env[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required secret: ${String(key)}`);
  }
  return value;
}
