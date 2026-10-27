/**
 * Decide which SQL files still need applying given what's already in `_migrations`.
 *
 * @param {string[]} paths absolute or glob keys (e.g. `/migrations/001_init.sql`)
 * @param {string[]} done names already recorded
 * @returns {{ name: string, path: string }[]}
 */
export function pendingMigrations(paths, done) {
  const applied = new Set(done);
  return [...paths]
    .map((path) => ({
      path,
      name: path.replace(/\\/g, "/").split("/").pop() ?? path,
    }))
    .filter((row) => row.name.endsWith(".sql") && !applied.has(row.name))
    .sort((a, b) => a.name.localeCompare(b.name));
}
