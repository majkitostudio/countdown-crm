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

/**
 * Migration parity: compares the versions on disk with the versions a database
 * reports as applied.
 *
 * `missingInDatabase` are versions the repository declares but the database has
 * never run. `missingOnDisk` are versions the database applied but no file
 * exists for — either a renamed/deleted migration or a hand-edited history.
 * Both directions are drift and should block further schema work.
 */
export function findParityGaps({ localVersions, appliedVersions }) {
  const local = new Set(localVersions);
  const applied = new Set(appliedVersions);

  return {
    missingInDatabase: [...local].filter((version) => !applied.has(version)).sort(),
    missingOnDisk: [...applied].filter((version) => !local.has(version)).sort(),
  };
}
