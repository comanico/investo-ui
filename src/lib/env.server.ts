export function env(key: string): string | undefined {
  const v = process.env[key]?.trim();
  return v || undefined;
}

/** `local` (default) reads investo-ro from disk; `prod` reads the same tree from S3. */
export function appEnv(): "local" | "prod" {
  return env("ENV")?.toLowerCase() === "prod" ? "prod" : "local";
}

/**
 * Workspace preview vs deployed app. The deployer writes GROK_PROJECT_ID on
 * every publish; the sandbox preview never has it. Single source of truth for
 * the split — gate audience, gate endpoints and connector-token semantics all
 * key off this predicate.
 */
export function isWorkspacePreview(): boolean {
  return !env("GROK_PROJECT_ID");
}
