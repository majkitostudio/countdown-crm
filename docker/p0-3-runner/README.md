# P0.3 runner v Dockeru

Image obsahuje pouze pinned Node image, runner a read-only SQL dotaz. Secret se
do image nikdy nepředává při buildu. Runner volá přímo read-only Management API;
Supabase CLI ani přímé Postgres připojení v image nejsou potřeba.

Build z kořene repozitáře:

```powershell
docker build -f docker/p0-3-runner/Dockerfile -t countdown-crm-p0-3-runner .
```

Kořenový `.dockerignore` zmenšuje build context na Dockerfile, runner a jeho
read-only SQL dotaz. Lokální `.env`, `.git` a Supabase CLI stav se do buildu
neposílají. Síťový požadavek má pevný timeout 30 sekund.

Spuštění předává hodnoty až za běhu z hostitelského secret manageru nebo
lokálního environmentu:

```powershell
docker run --rm `
  --env P0_3_LINKED_PROJECT_REF `
  --env SUPABASE_ACCESS_TOKEN `
  countdown-crm-p0-3-runner
```

Výchozí režim je read-only. Nepoužívejte `SUPABASE_SECRET_KEY` ani
`SUPABASE_SERVICE_ROLE_KEY`. Image nepoužívejte proti produkčnímu projektu.
