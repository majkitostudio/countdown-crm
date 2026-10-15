/**
 * Shared helpers for reasoning about migration file names.
 *
 * Supabase identifies an applied migration by the version prefix of its file
 * name — everything before the first underscore, e.g.
 * "20261014120000_team_leader_exception_pickup_risk.sql" -> "20261014120000".
 * Two files that share a version cannot both be applied reliably, because the
 * migration history records the version only.
 *
 * Kept dependency-free so both the verification script and the test suite can
 * use exactly the same rules.
 */

/** Version prefix of a migration file name (the part before the first underscore). */
export function migrationVersionOf(fileName) {
  return String(fileName).split("_")[0] ?? "";
}

/**
 * Groups migration file names whose version prefix collides.
 * Returns one entry per duplicated version, files sorted for stable output.
 */
export function findDuplicateVersions(fileNames) {
  const byVersion = new Map();
  for (const fileName of fileNames) {
    const version = migrationVersionOf(fileName);
    if (!byVersion.has(version)) byVersion.set(version, []);
    byVersion.get(version).push(fileName);
  }

  return [...byVersion.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([version, group]) => ({ version, files: [...group].sort() }))
    .sort((a, b) => a.version.localeCompare(b.version));
}
