# Linked function drift — root-cause verification

**Date:** 7. 9. 2026

**Scope:** P0.1, project-owned functions in `public` and `private`

**Target:** linked sandbox configured by the repository

## Result

The reported function drift is a line-ending false positive, not a logical,
authorization, signature, ownership, grant or configuration difference. No
database migration was created or deployed.

The local and linked catalogs contain the same 80 project-owned functions:

- 34 in `public`;
- 46 in `private`.

After removing only carriage-return characters (`chr(13)`) from `pg_proc.prosrc`,
both catalogs have identical function bodies and identical metadata. The metadata
comparison includes arguments, result type, `SECURITY DEFINER`/invoker state,
volatility, parallel/leakproof/strict flags, set-returning state, function kind,
`proconfig`, owner and ACL.

## Reproduction and root cause

Both `npx supabase db diff --linked --schema public` and the legacy
`--use-migra` engine emitted replacements for nine public functions. Direct
catalog queries then showed:

- local bodies had one CR character per line (`CRLF`);
- linked bodies had the same line count with no CR character (`LF`);
- hashes matched after removing only CR characters;
- signatures and security metadata already matched.

Across both project schemas, 29 functions currently have a local/linked line
ending difference. This is consistent with Supabase's documented pg-delta issue
[#242](https://github.com/supabase/pg-toolbelt/issues/242), where CRLF and LF in
otherwise identical function bodies produce no-op `CREATE OR REPLACE FUNCTION`
output. The issue is closed as not planned, so raw function diff output cannot be
treated as semantic evidence on its own.

## Durable verification

`npm run verify:linked-functions` now:

1. queries local and linked `pg_proc` catalogs through the pinned Supabase CLI;
2. excludes functions owned by extensions;
3. normalizes CRLF to LF without removing other whitespace;
4. compares body hashes and security-relevant metadata separately;
5. exits non-zero for a missing function, a real body change or a metadata/ACL
   change;
6. reports line-ending-only differences without treating them as schema changes.

`.gitattributes` pins migrations and pgTAP files to LF for consistent future
checkouts and deployments. Existing historical migration files are not rewritten.

## Deliberate exclusions

The `pgtap` extension and its public-schema objects are extension-owned, not
project-authored functions, and are deliberately excluded from the semantic
function comparison. Moving `pgtap` out of the exposed `public` schema remains a
separate Security Advisor item in P0.2.

## Evidence

- migration history: 84 local / 84 linked;
- focused verifier tests: 6/6 PASS, including body drift, metadata drift and
  missing-function cases;
- live semantic verifier: PASS, 80 functions, 29 line-ending-only differences;
- no remote write, migration repair, reset or schema mutation was performed.
