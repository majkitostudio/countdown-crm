# Countdown CRM — Customer Activity Contract (Task 2A)

> Stav zmapovaný 1. 9. 2026 na `origin/main`. Tento dokument je kontrakt a
> návrh read modelu pro další slice; sám o sobě nemění runtime ani databázi.

## Rozsah a rozhodnutí

Task 2A řeší pouze pravdivý, workspace-scoped read model pro časovou osu
klienta/lead. Cílem je sjednotit skutečné interní zdroje bez předstírání
externích kanálů.

Do tohoto slice nepatří nový provider, ingest, synchronizace, auditní diff UI,
migrace ani změna existujícího zápisu poznámek. `sms_paylink` a
`status_change` zůstávají nepodporované, dokud pro ně nebude skutečný a
ověřený zdroj.

## Současná implementace

### Read path

Aktuální cesta je rozdělená do několika vrstev:

1. `listWorkspaceLeadActivity` v `src/lib/dal/activity.ts` autorizuje kontext
   workspace a načte `calls` a `orders`.
2. `listLeadActivityAction` v `src/app/actions/crm.ts` tuto odpověď pouze
   předává dál.
3. `listLeadNotesAction` v `src/app/actions/leadNotes.ts` samostatně načte
   `lead_notes`.
4. `getLeadTimeline` v `src/lib/timeline.ts` na klientské straně vytvoří
   položky, spojí je a seřadí podle času.
5. `getLeadActivities` v `src/lib/domainActivity.ts` převede položky do
   obecného `WorkspaceActivity`.

`CustomerTimelineCard` a `LeadDetailDrawer` používají tento stejný převod,
zatímco `Customer360RetentionCard` používá pouze oddělený souhrn calls/orders.
Historie objednávek v `CustomerPanel` je další samostatný pohled podle
normalizovaného telefonu; není součástí lead timeline a leady neslučuje.

### Skutečné zdroje, které dnes timeline naplňují

| Zdroj | Zdrojový čas | Identita dnes | Co se zobrazí | Stav |
|---|---|---|---|---|
| `calls` | `created_at` | `tl-call-<call.id>` | délka, outcome, sentiment | podporováno |
| `orders` | `created_at` | `tl-ord-<order.id>` | produkt, částka, `order_source`, poznámka | podporováno |
| `lead_notes` | `created_at` | `tl-note-<note.id>` | text poznámky, autor | podporováno |
| `sms_paylink` | — | — | nic | pouze deklarovaný typ |
| `status_change` | — | — | nic | pouze deklarovaný typ |

`lead_queue_events` obsahuje skutečnou historii směrování a lifecycle queue,
ale migrace výslovně říká, že operátoři ji nedostávají jako obecný browserový
activity stream. `audit_logs` je samostatný auditní zdroj s vlastním rolovým
omezením a patří do Tasku 3, ne do této běžné timeline.

## Zjištěné mezery současného kontraktu

- `WorkspaceActivity.source` je vždy literál `"supabase"`; nepopisuje zdroj ani
  kanál události.
- `WorkspaceActivityType` deklaruje SMS a změnu statusu, ale builder pro ně
  nemá žádný zdroj. UI proto nabízí SMS filtr bez možnosti, aby ho současný
  read path naplnil.
- `order_id` je součástí navrženého metadata typu, ale aktuální order mapper
  ho do metadata nepřenáší.
- Každý zdroj má vlastní dotaz a vlastní `limit`; lead timeline nemá jeden
  společný limit, cursor, `has_more` ani `next_cursor`.
- Řazení používá pouze timestamp. Při shodném čase není určena stabilní
  sekundární hodnota.
- Deduplikace není explicitní. Dnešní tabulky mají oddělené identity, ale
  sjednocený kontrakt musí mít deterministický klíč.
- Actor je do DTO převáděn z profilu podle `agent_id`/`author_id`; klient nesmí
  actor identity dodávat ani přepisovat. Profilové lookupy musí při nové
  implementaci zachovat workspace-consistent boundary.
- `listWorkspaceLeadActivity` ověřuje členství ve workspace a filtruje
  `workspace_id` + `lead_id`, ale sama neaplikuje operator-only pravidlo
  `getScopedLeadForWorkspace`. Route detailu ho volá předem, avšak serverový
  activity reader musí být bezpečný i při přímém volání action/DAL. To je
  povinná autorizační podmínka pro implementaci 2A, ne důvod vyrábět data v UI.

## Minimální navržený read model

Návrh používá pouze skutečně podporované zdroje. Názvy jsou záměrně odlišeny
od historického `WorkspaceActivity`, aby se starý volnější typ nepovažoval za
hotový kontrakt.

```ts
type CustomerActivitySource = "call" | "order" | "lead_note";
type CustomerActivityChannel = "voice" | "commerce" | "internal_note";

type CustomerActivityEvent = {
  id: string;                 // `${source}:${sourceEntityId}`
  source_entity_id: string;  // skutečné id v source tabulce
  workspace_id: string;      // serverní invariant; neposílat z klienta zpět
  lead_id: string;
  occurred_at: string;       // zdrojový TIMESTAMPTZ, ne čas vytvořený klientem
  source: CustomerActivitySource;
  channel: CustomerActivityChannel;
  actor: {
    id: string | null;
    display_name: string;
  };
  preview: {
    title: string;
    text: string | null;
  };
  metadata: {
    duration_seconds?: number;
    call_outcome?: string;
    sentiment?: string;
    amount?: number;
    currency?: string;
    order_source?: string;
  };
};

type CustomerActivityPage = {
  items: CustomerActivityEvent[];
  next_cursor: string | null;
  has_more: boolean;
};
```

Pravidla kontraktu:

- `id` je namespacované skutečným zdrojem a jeho primární identitou; klient ho
  nikdy negeneruje.
- `occurred_at` je vždy čas zdrojového záznamu. Pro stejné timestampy se řadí
  deterministicky podle `(occurred_at DESC, id DESC)`.
- `source` znamená konkrétní interní zdroj, `channel` pouze podporovaný
  význam. Neexistuje `sms` nebo `chat` hodnota bez reálné provider tabulky a
  ingestu.
- `preview` je bezpečný, stručný text. Raw transcript, paylink URL a jiné
  citlivé hodnoty se nepřidávají automaticky; metadata se whitelistují podle
  zdroje.
- `actor` se řeší serverově z autorizovaného záznamu. Chybějící profil je
  explicitně `Unknown operator`, ne klientem dodaná identita.
- `workspace_id` je invariant read boundary. Klient může dodat pouze lead a
  paging/filter parametry, nikdy workspace nebo actor jako autoritu.

## Query a authorization contract

Navržený serverový reader má mít tvar obdobný:

```ts
listCustomerActivityForLead(
  leadId: string,
  options?: { cursor?: string; limit?: number; sources?: CustomerActivitySource[] },
): Promise<CustomerActivityPage>
```

Server musí v tomto pořadí:

1. vyřešit přihlášeného uživatele a `WorkspaceContext` přes
   `requireWorkspaceContext`; požadovaný workspace není důvěryhodný sám o
   sobě;
2. ověřit lead ve stejném workspace a pro operátora vyžadovat stejný scope
   jako `getScopedLeadForWorkspace` (aktuální assignment); team leader a
   administrator mohou číst leady svého workspace;
3. načíst každý povolený zdroj s explicitním `.eq("workspace_id", context.workspaceId)`
   a `.eq("lead_id", leadId)`; RLS zůstává druhou, nikoli jedinou hranicí;
4. actor lookup odvodit ze serverových foreign keys a workspace-consistent
   profilové hranice;
5. normalizovat, deduplikovat a sloučit zdroje do jednoho pořadí;
6. vrátit jeden společný limit a opaque cursor navázaný na poslední dvojici
   `(occurred_at, id)`, aby reload nebo další stránka neopakovaly ani
   nepřeskakovaly položky.

### Doporučený způsob stránkování

Nejmenší bezpečná implementace může dočasně použít `UNION ALL` read query/view
na serveru. Pokud zůstanou oddělené dotazy, musí každý zdroj načíst omezený
overfetch podle cursoru a merge vrstva musí teprve potom uplatnit globální
limit, deduplikaci a `has_more`. Samostatné `limit` na calls a orders není
ekvivalent sjednocené stránce.

## Source mapping pro další implementaci

| Contract field | `calls` | `orders` | `lead_notes` |
|---|---|---|---|
| `source` | `call` | `order` | `lead_note` |
| `channel` | `voice` | `commerce` | `internal_note` |
| `source_entity_id` | `calls.id` | `orders.id` | `lead_notes.id` |
| `occurred_at` | `calls.created_at` | `orders.created_at` | `lead_notes.created_at` |
| `lead_id` | `calls.lead_id` | `orders.lead_id` | `lead_notes.lead_id` |
| `actor.id` | `calls.agent_id` | `orders.agent_id` | `lead_notes.author_id` |
| `preview.text` | stručný outcome/délka/sentiment | produkt + source note | `body` |
| safe metadata | duration, outcome, sentiment | amount, currency, order source | žádné další |

Order item snapshot může posloužit jako bezpečný produktový preview, ale celý
order DTO ani status history nemají být bez rozhodnutí vloženy do obecných
timeline metadata. Změny statusu objednávky a klientských polí se budou řešit
na vlastních serverových/auditních hranicích.

## Verification boundary

Tento slice je dokumentační. Provedená kontrola je statické mapování aktuálního
kódu, migrací a testních kontraktů na branchi z `origin/main`.

Následující důkazy nejsou součástí tohoto commitu a zůstávají pro implementační
slices:

- browser snapshot/flow a refresh persistence: N/A, UI se nemění;
- SQL create → reload → read-back: N/A, tento slice nic nezapisuje;
- cross-workspace authorization/RLS negative: N/A jako live test, ale výše je
  zachycena povinná serverová boundary a existující riziko přímého activity
  readeru pro operátora;
- provider/webhook/event-id deduplikace: N/A, žádný externí zdroj není
  implementován;
- audit trail: záměrně N/A, patří do Tasku 3.

Implementace 2B smí začít až nad tímto kontraktem. Její acceptance musí
prokázat jednotný chronologický stream, pravdivé empty/loading/unavailable
stavy a zachování authorization boundary. Persistence a negativní RLS důkaz
se přidají pouze tehdy, pokud 2B/2C změní skutečný write nebo serverový
authorization surface.
