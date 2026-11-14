import "server-only";

import { DataAccessError } from "@/lib/dal/errors";
import { listAuditLogsForWorkspace, type AuditLogDTO } from "@/lib/dal/audit";
import {
  listOperatorCalendarEntriesForWorkspace,
  type CalendarLoadResult,
} from "@/lib/dal/calendar";
import { getWalletOverview, type WalletOverviewDTO, type WalletSectionState } from "@/lib/dal/wallet";
import { listQueueItemsForWorkspace, type QueueItemDTO } from "@/lib/dal/leadQueue";
import { listProductsForWorkspace, type ProductDTO } from "@/lib/dal/products";
import {
  listProductScriptVersionsForWorkspace,
  type ProductScriptVersionDTO,
} from "@/lib/dal/productScripts";
import { getWorkspaceTelephonySettings, type WorkspaceTelephonySettings } from "@/lib/dal/telephonySettings";
import { listWorkflowsForWorkspace } from "@/lib/dal/workflows";
import { requireWorkspaceRole } from "@/lib/dal/workspace";
import { TRIGGER_REGISTRY, type WorkflowRule } from "@/lib/workflows/types";
import { TELNYX_BLOCKER_COPY } from "@/lib/telephony/telephonyAdapterShared";

export type ReadinessStatus = "ready" | "needs_attention" | "blocked";

export type WorkspaceReadinessCheckKey =
  | "calendar"
  | "wallet"
  | "lead_queue"
  | "published_scripts"
  | "local_sip"
  | "telnyx"
  | "migration_history"
  | "workflows"
  | "role_boundaries"
  | "critical_errors";

export interface WorkspaceReadinessCheck {
  key: WorkspaceReadinessCheckKey;
  label: string;
  status: ReadinessStatus;
  summary: string;
  details: string;
  checkedAt: string;
  actionHref: string | null;
}

export interface WorkspaceReadinessDTO {
  workspaceId: string;
  checkedAt: string;
  overallStatus: ReadinessStatus;
  checks: WorkspaceReadinessCheck[];
}

export type ReadinessProbe<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

export interface MigrationReadinessEvidence {
  status: "verified" | "mismatch" | "unavailable";
  summary: string;
  details: string;
}

export interface RoleBoundaryReadinessEvidence {
  status: ReadinessStatus;
  summary: string;
  details: string;
}

export interface TelnyxReadinessEvidence {
  status: ReadinessStatus;
  summary: string;
  details: string;
}

export interface WorkspaceReadinessInputs {
  workspaceId: string;
  checkedAt: string;
  calendar: ReadinessProbe<CalendarLoadResult>;
  wallet: ReadinessProbe<WalletOverviewDTO>;
  queue: ReadinessProbe<QueueItemDTO[]>;
  productsAndScripts: ReadinessProbe<WorkspaceProductsAndScripts>;
  workflows: ReadinessProbe<WorkflowRule[]>;
  telephony: ReadinessProbe<WorkspaceTelephonySettings>;
  migration: MigrationReadinessEvidence;
  roleBoundaries: RoleBoundaryReadinessEvidence;
  criticalErrors: ReadinessProbe<AuditLogDTO[]>;
  telnyx: TelnyxReadinessEvidence;
}

export interface WorkspaceProductsAndScripts {
  products: ProductDTO[];
  versions: ProductScriptVersionDTO[];
}

function createCheck(
  key: WorkspaceReadinessCheckKey,
  label: string,
  status: ReadinessStatus,
  summary: string,
  details: string,
  checkedAt: string,
  actionHref: string | null,
): WorkspaceReadinessCheck {
  return { key, label, status, summary, details, checkedAt, actionHref };
}

function buildCalendarCheck(
  probe: ReadinessProbe<CalendarLoadResult>,
  checkedAt: string,
): WorkspaceReadinessCheck {
  if (!probe.ok) {
    return createCheck(
      "calendar",
      "Kalendář",
      "needs_attention",
      "Kalendář není dostupný.",
      probe.message,
      checkedAt,
      "/schedule",
    );
  }

  const unavailableSources = Object.entries(probe.value.sources)
    .filter(([, source]) => source.state === "unavailable")
    .map(([name, source]) => `${({ scheduledCalls: "Naplánované hovory", reminders: "Připomínky" } as Record<string, string>)[name] ?? name}: ${source.state === "unavailable" ? source.message : "nedostupné"}`);

  if (unavailableSources.length > 0) {
    return createCheck(
      "calendar",
      "Kalendář",
      "needs_attention",
      "Kalendář je dostupný jen částečně.",
      unavailableSources.join(" "),
      checkedAt,
      "/schedule",
    );
  }

  return createCheck(
    "calendar",
    "Kalendář",
    "ready",
    "Zdroje kalendáře jsou dostupné.",
    `Počet záznamů kalendáře z naplánovaných hovorů a připomínek: ${probe.value.entries.length}.`,
    checkedAt,
    "/schedule",
  );
}

function buildWalletCheck(
  probe: ReadinessProbe<WalletOverviewDTO>,
  checkedAt: string,
): WorkspaceReadinessCheck {
  if (!probe.ok) {
    return createCheck(
      "wallet",
      "Peněženka",
      "needs_attention",
      "Peněženka není dostupná.",
      probe.message,
      checkedAt,
      "/wallet",
    );
  }

  const sectionEntries = Object.entries(probe.value.sections) as Array<[string, WalletSectionState]>;
  const unavailableSections = sectionEntries
    .filter(([, section]) => section.state === "unavailable")
    .map(([name, section]) => `${({ balances: "Zůstatky", transactions: "Transakce", settings: "Nastavení", members: "Členové", profiles: "Profily", rules: "Pravidla" } as Record<string, string>)[name] ?? name}: ${section.state === "unavailable" ? section.message : "nedostupné"}`);
  const notApplicableSections = sectionEntries
    .filter(([, section]) => section.state === "not_applicable")
    .map(([name]) => ({ balances: "Zůstatky", transactions: "Transakce", settings: "Nastavení", members: "Členové", profiles: "Profily", rules: "Pravidla" } as Record<string, string>)[name] ?? name);

  if (unavailableSections.length > 0 || notApplicableSections.length > 0) {
    const details = [
      unavailableSections.join(" "),
      notApplicableSections.length > 0
        ? `Nepoužitelné sekce: ${notApplicableSections.join(", ")}.`
        : "",
    ].filter(Boolean).join(" ");

    return createCheck(
      "wallet",
      "Peněženka",
      "needs_attention",
      "Peněženka je dostupná jen částečně.",
      details,
      checkedAt,
      "/wallet",
    );
  }

  return createCheck(
    "wallet",
    "Peněženka",
    "ready",
    "Sekce peněženky jsou dostupné.",
    `Načtené transakce: ${probe.value.transactions.length}; zůstatky: ${probe.value.balances.length}.`,
    checkedAt,
    "/wallet",
  );
}

function buildQueueCheck(
  probe: ReadinessProbe<QueueItemDTO[]>,
  checkedAt: string,
): WorkspaceReadinessCheck {
  if (!probe.ok) {
    return createCheck(
      "lead_queue",
      "Fronta leadů",
      "needs_attention",
      "Fronta leadů není dostupná.",
      probe.message,
      checkedAt,
      "/console",
    );
  }

  const queueLabel = probe.value.length === 0
    ? "Fronta leadů je dostupná, ale prázdná."
    : `Fronta leadů je dostupná. Počet položek: ${probe.value.length}.`;

  return createCheck(
    "lead_queue",
    "Fronta leadů",
    "ready",
    queueLabel,
    "Server vrátil aktuální frontu pracovního prostoru bez vytváření náhradních přiřazení.",
    checkedAt,
    "/console",
  );
}

function buildPublishedScriptsCheck(
  probe: ReadinessProbe<WorkspaceProductsAndScripts>,
  checkedAt: string,
): WorkspaceReadinessCheck {
  if (!probe.ok) {
    return createCheck(
      "published_scripts",
      "Publikované skripty",
      "needs_attention",
      "Publikované skripty nejsou dostupné.",
      probe.message,
      checkedAt,
      "/products?tab=scripts",
    );
  }

  if (probe.value.products.length === 0) {
    return createCheck(
      "published_scripts",
      "Publikované skripty",
      "needs_attention",
      "Nejsou dostupné žádné produkty k ověření.",
      "Katalog nevrátil žádné produkty, takže systém nemůže potvrdit připravenost skriptů pro operátory.",
      checkedAt,
      "/products",
    );
  }

  const publishedProductIds = new Set(
    probe.value.versions
      .filter((version) => version.status === "published")
      .map((version) => version.product_id),
  );
  const missingProducts = probe.value.products.filter((product) => !publishedProductIds.has(product.id));

  if (missingProducts.length > 0) {
    const productNames = missingProducts.slice(0, 5).map((product) => product.title).join(", ");
    const suffix = missingProducts.length > 5 ? " a další" : "";
    return createCheck(
      "published_scripts",
      "Publikované skripty",
      "needs_attention",
      `Počet produktů bez publikovaného skriptu: ${missingProducts.length}.`,
      `Produkty vyžadující publikovanou verzi: ${productNames}${suffix}.`,
      checkedAt,
      "/products?tab=scripts",
    );
  }

  return createCheck(
    "published_scripts",
    "Publikované skripty",
    "ready",
    "Každý produkt v katalogu má publikovaný skript.",
    `Počet produktů s publikovanou verzí dostupnou operátorům: ${probe.value.products.length}.`,
    checkedAt,
    "/products?tab=scripts",
  );
}

function buildLocalSipCheck(
  probe: ReadinessProbe<WorkspaceTelephonySettings>,
  checkedAt: string,
): WorkspaceReadinessCheck {
  if (!probe.ok) {
    return createCheck(
      "local_sip",
      "Lokální SIP",
      "needs_attention",
      "Nastavení lokálního SIP není dostupné.",
      probe.message,
      checkedAt,
      "/settings#telephony-adapter",
    );
  }

  if (probe.value.active_adapter !== "local_sip") {
    return createCheck(
      "local_sip",
      "Lokální SIP",
      "needs_attention",
      "Lokální SIP není aktivní.",
      `Aktivní telefonní adaptér: ${probe.value.active_adapter}. Lokální SIP lze zapnout v nastavení správy.`,
      checkedAt,
      "/settings#telephony-adapter",
    );
  }

  return createCheck(
    "local_sip",
    "Lokální SIP",
    "ready",
    "Pro tento pracovní prostor je zvolen lokální SIP.",
    "Nastavení pracovního prostoru odkazuje na lokální SIP adaptér. Živý hlasový hovor zůstává samostatnou pilotní kontrolou.",
    checkedAt,
    "/telephony",
  );
}

function buildWorkflowsCheck(
  probe: ReadinessProbe<WorkflowRule[]>,
  checkedAt: string,
): WorkspaceReadinessCheck {
  if (!probe.ok) {
    return createCheck(
      "workflows",
      "Automatizace",
      "needs_attention",
      "Automatizace nejsou dostupné.",
      probe.message,
      checkedAt,
      "/automations",
    );
  }

  const unavailableTriggers = probe.value
    .filter((rule) => rule.enabled)
    .map((rule) => TRIGGER_REGISTRY.find((definition) => definition.type === rule.trigger))
    .filter((definition) => definition?.serverDispatch === "unavailable")
    .map((definition) => definition?.label)
    .filter((label): label is string => Boolean(label));

  if (unavailableTriggers.length > 0) {
    return createCheck(
      "workflows",
      "Automatizace",
      "needs_attention",
      "Některé aktivní spouštěče automatizací jsou nedostupné.",
      `Nedostupné aktivní spouštěče: ${Array.from(new Set(unavailableTriggers)).join(", ")}.`,
      checkedAt,
      "/automations",
    );
  }

  return createCheck(
    "workflows",
    "Automatizace",
    "ready",
    "Pravidla automatizací lze načíst.",
    `Počet pravidel automatizací načtených z pracovního prostoru: ${probe.value.length}.`,
    checkedAt,
    "/automations",
  );
}

function buildMigrationCheck(
  evidence: MigrationReadinessEvidence,
  checkedAt: string,
): WorkspaceReadinessCheck {
  const status: ReadinessStatus = evidence.status === "verified"
    ? "ready"
    : evidence.status === "mismatch"
      ? "blocked"
      : "needs_attention";

  return createCheck(
    "migration_history",
    "Historie migrací",
    status,
    evidence.summary,
    evidence.details,
    checkedAt,
    null,
  );
}

function buildRoleBoundaryCheck(
  evidence: RoleBoundaryReadinessEvidence,
  checkedAt: string,
): WorkspaceReadinessCheck {
  return createCheck(
    "role_boundaries",
    "RLS a hranice oprávnění rolí",
    evidence.status,
    evidence.summary,
    evidence.details,
    checkedAt,
    null,
  );
}

function buildCriticalErrorsCheck(
  probe: ReadinessProbe<AuditLogDTO[]>,
  checkedAt: string,
): WorkspaceReadinessCheck {
  if (!probe.ok) {
    return createCheck(
      "critical_errors",
      "Nedávné kritické chyby",
      "needs_attention",
      "Nedávné kritické chyby se nepodařilo zkontrolovat.",
      probe.message,
      checkedAt,
      "/audit",
    );
  }

  const checkedTime = Date.parse(checkedAt);
  const cutoff = Number.isFinite(checkedTime)
    ? checkedTime - 24 * 60 * 60 * 1000
    : Number.NEGATIVE_INFINITY;
  const recentCriticalErrors = probe.value.filter((entry) => {
    const timestamp = Date.parse(entry.timestamp);
    return (entry.severity === "critical" || entry.severity === "high")
      && Number.isFinite(timestamp)
      && timestamp >= cutoff
      && timestamp <= checkedTime;
  });

  if (recentCriticalErrors.length > 0) {
    const details = recentCriticalErrors
      .slice(0, 3)
      .map((entry) => `${entry.action}: ${entry.details}`)
      .join(" ");
    return createCheck(
      "critical_errors",
      "Nedávné kritické chyby",
      "needs_attention",
      `Počet auditních událostí s vysokou nebo kritickou závažností ke kontrole: ${recentCriticalErrors.length}.`,
      details,
      checkedAt,
      "/audit",
    );
  }

  return createCheck(
    "critical_errors",
    "Nedávné kritické chyby",
    "ready",
    "Nebyly nalezeny žádné nedávné auditní události s vysokou nebo kritickou závažností.",
    "Auditní události pracovního prostoru za posledních 24 hodin neobsahují žádné záznamy s vysokou nebo kritickou závažností.",
    checkedAt,
    "/audit",
  );
}

function overallStatus(checks: WorkspaceReadinessCheck[]): ReadinessStatus {
  if (checks.some((check) => check.status === "blocked")) return "blocked";
  if (checks.some((check) => check.status === "needs_attention")) return "needs_attention";
  return "ready";
}

export function buildWorkspaceReadiness(inputs: WorkspaceReadinessInputs): WorkspaceReadinessDTO {
  const checks = [
    buildCalendarCheck(inputs.calendar, inputs.checkedAt),
    buildWalletCheck(inputs.wallet, inputs.checkedAt),
    buildQueueCheck(inputs.queue, inputs.checkedAt),
    buildPublishedScriptsCheck(inputs.productsAndScripts, inputs.checkedAt),
    buildLocalSipCheck(inputs.telephony, inputs.checkedAt),
    createCheck(
      "telnyx",
      "Adaptér Telnyx",
      inputs.telnyx.status,
      inputs.telnyx.summary,
      inputs.telnyx.details,
      inputs.checkedAt,
      "/settings#telephony-adapter",
    ),
    buildMigrationCheck(inputs.migration, inputs.checkedAt),
    buildRoleBoundaryCheck(inputs.roleBoundaries, inputs.checkedAt),
    buildCriticalErrorsCheck(inputs.criticalErrors, inputs.checkedAt),
    buildWorkflowsCheck(inputs.workflows, inputs.checkedAt),
  ];

  return {
    workspaceId: inputs.workspaceId,
    checkedAt: inputs.checkedAt,
    overallStatus: overallStatus(checks),
    checks,
  };
}

function toProbe<T>(result: PromiseSettledResult<T>, fallbackMessage: string): ReadinessProbe<T> {
  if (result.status === "fulfilled") return { ok: true, value: result.value };

  if (result.reason instanceof DataAccessError) {
    return { ok: false, message: result.reason.message };
  }

  return { ok: false, message: fallbackMessage };
}

function hasConfiguredValue(name: string): boolean {
  const value = process.env[name]?.trim();
  if (!value) return false;
  return !/^your[-_]/i.test(value) && !value.includes("000000000000");
}

function getTelnyxReadinessEvidence(): TelnyxReadinessEvidence {
  if (process.env.NEXT_PUBLIC_TELNYX_ENABLED !== "true") {
    return {
      status: "blocked",
      summary: "Pilot Telnyx je zablokován.",
      details: TELNYX_BLOCKER_COPY,
    };
  }

  if (process.env.TELNYX_NUMBER_VERIFIED !== "true") {
    return {
      status: "blocked",
      summary: "Chybí ověření čísla Telnyx.",
      details: "Adaptér Telnyx nelze považovat za připravený, dokud přiřazené číslo neprojde externím ověřením.",
    };
  }

  const requiredVariables = [
    "TELNYX_API_KEY",
    "TELNYX_CONNECTION_ID",
    "TELNYX_DEFAULT_CALLER_NUMBER",
    "TELNYX_PUBLIC_KEY",
  ];
  const missingVariables = requiredVariables.filter((name) => !hasConfiguredValue(name));

  if (missingVariables.length > 0) {
    return {
      status: "needs_attention",
      summary: "Číslo Telnyx je ověřené, ale nastavení není úplné.",
      details: `Chybí povinné nastavení serveru: ${missingVariables.join(", ")}.`,
    };
  }

  return {
    status: "ready",
    summary: "Nastavení Telnyx je k dispozici.",
    details: "Povinné nastavení serveru a externí ověření čísla jsou k dispozici. Živý hlasový hovor v prohlížeči zůstává samostatným pilotním ověřením.",
  };
}

function getMigrationReadinessEvidence(): MigrationReadinessEvidence {
  const status = process.env.WORKSPACE_MIGRATION_STATUS?.trim().toLowerCase();
  const verifiedAt = process.env.WORKSPACE_MIGRATION_VERIFIED_AT?.trim();

  if (status === "mismatch") {
    return {
      status: "mismatch",
      summary: "Historie migrací neodpovídá uloženým dokladům o nasazení.",
      details: "Zastavte nasazování a ověřte shodu dokladů o migracích a schématu, než se na tento pracovní prostor spolehnete.",
    };
  }

  if (status === "verified" && verifiedAt && Number.isFinite(Date.parse(verifiedAt))) {
    return {
      status: "verified",
      summary: "Historie migrací je ověřená.",
      details: `Čas zaznamenaného ověření migrací: ${verifiedAt}.`,
    };
  }

  return {
    status: "unavailable",
    summary: "Doklady o historii migrací nejsou za běhu dostupné.",
    details: "Aplikace během požadavku nespouští migrace v příkazové řádce. Než označíte historii migrací za připravenou, zaznamenejte ověření nasazení.",
  };
}

function getRoleBoundaryReadinessEvidence(): RoleBoundaryReadinessEvidence {
  const status = process.env.WORKSPACE_ROLE_BOUNDARY_STATUS?.trim().toLowerCase();
  const verifiedAt = process.env.WORKSPACE_ROLE_BOUNDARY_VERIFIED_AT?.trim();

  if (status === "mismatch") {
    return {
      status: "blocked",
      summary: "Doklady o hranicích oprávnění rolí vykazují nesoulad.",
      details: "Zastavte nasazování a sjednoťte serverovou matici rolí se zásadami RLS pracovního prostoru, než se na hranice přístupu spolehnete.",
    };
  }

  if (status === "verified" && verifiedAt && Number.isFinite(Date.parse(verifiedAt))) {
    return {
      status: "ready",
      summary: "Doklady o RLS a hranicích oprávnění rolí jsou ověřené.",
      details: `Čas zaznamenaného ověření matice rolí a RLS: ${verifiedAt}.`,
    };
  }

  return {
    status: "needs_attention",
    summary: "Doklady o RLS a hranicích oprávnění rolí nejsou zaznamenané.",
    details: "Serverová ochrana přístupu administrátora je aktivní, ale za běhu chybí zaznamenané negativní testy matice rolí a RLS pro potvrzení úplné připravenosti.",
  };
}

export async function getWorkspaceReadinessForWorkspace(): Promise<WorkspaceReadinessDTO> {
  const { workspaceId } = await requireWorkspaceRole(["administrator"]);
  const [calendar, wallet, queue, productsAndScripts, workflows, telephony, criticalErrors] = await Promise.allSettled([
    listOperatorCalendarEntriesForWorkspace(undefined, undefined, workspaceId),
    getWalletOverview(),
    listQueueItemsForWorkspace(workspaceId),
    Promise.all([
      listProductsForWorkspace({ workspaceId }),
      listProductScriptVersionsForWorkspace(workspaceId),
    ]).then(([products, versions]) => ({ products, versions })),
    listWorkflowsForWorkspace(),
    getWorkspaceTelephonySettings(),
    listAuditLogsForWorkspace(),
  ]);

  return buildWorkspaceReadiness({
    workspaceId,
    checkedAt: new Date().toISOString(),
    calendar: toProbe(calendar, "Kalendář se nepodařilo načíst."),
    wallet: toProbe(wallet, "Peněženku se nepodařilo načíst."),
    queue: toProbe(queue, "Frontu leadů se nepodařilo načíst."),
    productsAndScripts: toProbe(productsAndScripts, "Produkty a publikované skripty se nepodařilo načíst."),
    workflows: toProbe(workflows, "Automatizace se nepodařilo načíst."),
    telephony: toProbe(telephony, "Nastavení telefonie se nepodařilo načíst."),
    migration: getMigrationReadinessEvidence(),
    roleBoundaries: getRoleBoundaryReadinessEvidence(),
    criticalErrors: toProbe(criticalErrors, "Nedávné kritické chyby se nepodařilo zkontrolovat."),
    telnyx: getTelnyxReadinessEvidence(),
  });
}
