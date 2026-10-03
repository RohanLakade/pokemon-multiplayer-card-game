import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  // The only origin allowed to call the API from a browser.
  // new URL(...).origin drops any trailing slash, which would otherwise break the CORS match.
  CLIENT_ORIGIN: z.url().transform((value) => new URL(value).origin),
  // How many reverse proxies sit in front of the server (0 locally, 1 on Render).
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
});

// Reads and checks the settings. The server refuses to start if one is wrong.
export function loadConfig(env = process.env) {
  const result = envSchema.safeParse(env);

  if (!result.success) {
    // Only variable names and problems are shown, never the values (they may be secrets)
    const problems = result.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`,
    );
    throw new Error(`Invalid environment variables:\n${problems.join('\n')}`);
  }

  const { PORT, CLIENT_ORIGIN, TRUST_PROXY } = result.data;
  return { port: PORT, clientOrigin: CLIENT_ORIGIN, trustProxy: TRUST_PROXY };
}
