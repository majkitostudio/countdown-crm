# Test Team Leader provisioning

The application currently manages roles for existing Auth users; it does not
invite or create users from the browser. This trusted local script provides a
repeatable path for the remaining Team Leader browser/RLS evidence without
writing directly to `auth.users`.

## Safety boundary

- Run the script only from a trusted local environment.
- Use `SUPABASE_SECRET_KEY` (preferred) or the legacy
  `SUPABASE_SERVICE_ROLE_KEY`; never expose either as `NEXT_PUBLIC_*`.
- Provide the password through `TEST_TEAM_LEADER_PASSWORD`, not a command-line
  argument. The script never prints it.
- `--invite` sends an Auth invitation email. Without it, the script creates an
  email-confirmed password user for controlled test environments.
- Membership insertion is rolled back by deleting the newly created Auth user
  if that step fails.
- Cleanup requires `--confirm-cleanup`; deleting the Auth user additionally
  requires `--delete-auth-user`.

## Password-based test account

Set these variables in the trusted shell or a local ignored env file:

```powershell
$env:SUPABASE_URL = "https://<project-ref>.supabase.co"
$env:SUPABASE_SECRET_KEY = "sb_secret_..."
$env:TEST_TEAM_LEADER_WORKSPACE_ID = "<workspace-uuid>"
$env:TEST_TEAM_LEADER_EMAIL = "test-team-leader@example.test"
$env:TEST_TEAM_LEADER_PASSWORD = "<local-test-password>"
$env:TEST_TEAM_LEADER_FULL_NAME = "Test Team Leader"
```

Create the account and membership:

```powershell
npm run provision:test-team-leader
```

The output contains only the action, Auth user id, email and assigned role.

## Invitation-based account

For a real mailbox and configured Supabase email provider:

```powershell
npm run provision:test-team-leader -- --invite
```

The user must complete the invitation flow before browser login. The redirect
must be configured in Supabase Auth settings.

## Cleanup

The default cleanup removes only the `team_leader` membership and leaves the
Auth identity available for a later controlled run:

```powershell
npm run provision:test-team-leader -- --cleanup --confirm-cleanup
```

To remove both the membership and the Auth identity, use the additional
explicit flag:

```powershell
npm run provision:test-team-leader -- --cleanup --confirm-cleanup --delete-auth-user
```

The script is intentionally not exposed through the UI or a public API route.
