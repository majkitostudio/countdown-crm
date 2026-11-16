import { Mail, Phone } from "lucide-react";
import type { LeadDTO } from "@/lib/dal/leads";
import { getLeadStatusLabel } from "@/lib/leadStatus";
import { formatDateTime } from "@/lib/datetime";
import { Avatar, AvatarFallback } from "@/components/shadcn/avatar";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/card";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/shadcn/item";
import { Separator } from "@/components/shadcn/separator";
import { Badge } from "@/components/shadcn/badge";
import { getStatusClassName } from "@/components/ui/Status";
import { cn } from "@/lib/utils";

const CONTACT_VALUE_CLASS_NAME =
  "line-clamp-none w-auto break-words whitespace-normal text-text-primary";
const META_LABEL_CLASS_NAME = "text-xs text-text-muted";
const META_VALUE_CLASS_NAME = "min-w-0 text-sm break-words text-text-secondary";
const SUBHEADING_CLASS_NAME =
  "text-xs font-semibold uppercase tracking-wider text-text-muted";

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

interface ContactRow {
  key: string;
  label: string;
  value: string;
  icon: typeof Phone;
  mono?: boolean;
}

/**
 * Identity card, approved variant C "contact first": phone and e-mail lead in
 * a muted panel, secondary metadata follows as a definition list. The card is
 * read-only — no buttons or links inside.
 */
export function CustomerIdentityCard({ lead }: { lead: LeadDTO }) {
  const locality = [lead.city, lead.country].filter(Boolean).join(", ");

  const contacts: ContactRow[] = [
    { key: "phone", label: "Telefon", value: lead.phone, icon: Phone, mono: true },
    { key: "email", label: "E-mail", value: lead.email || "—", icon: Mail },
  ];

  return (
    <Card data-testid="customer-identity" className="@container/identity">
      <CardHeader className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex min-w-0 basis-40 grow items-center gap-3">
          <Avatar size="lg" className="bg-surface-inset">
            <AvatarFallback className="font-mono text-xs text-text-secondary">
              {getInitials(lead.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col gap-0.5">
            <CardTitle className="text-sm">
              <h2>Kontakt a stav</h2>
            </CardTitle>
            <CardDescription className="text-xs text-text-muted">
              Identita zákazníka z pracovního prostoru
            </CardDescription>
          </div>
        </div>
        <CardAction className="ms-auto">
          <Badge
            variant="outline"
            className={cn("h-auto border px-1.5 py-0.5 font-medium", getStatusClassName("neutral"))}
          >
            {getLeadStatusLabel(lead.status)}
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <Item variant="muted" className="block border-border bg-surface-inset p-4">
          <ItemGroup className="gap-2.5">
            {contacts.map((row) => {
              const Icon = row.icon;
              return (
                <Item key={row.key} role="listitem" size="sm" className="px-0 py-0">
                  <ItemMedia variant="icon">
                    <Icon className="size-4 text-text-muted" strokeWidth={1.75} aria-hidden="true" />
                  </ItemMedia>
                  <ItemContent className="min-w-0 gap-0.5">
                    <ItemTitle
                      className={cn(CONTACT_VALUE_CLASS_NAME, row.mono && "font-mono break-all")}
                    >
                      {row.value}
                    </ItemTitle>
                    <ItemDescription className="text-xs text-text-muted">{row.label}</ItemDescription>
                  </ItemContent>
                </Item>
              );
            })}
          </ItemGroup>
        </Item>

        <Separator />

        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 @lg/identity:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-1">
            <dt className={META_LABEL_CLASS_NAME}>Lokalita</dt>
            <dd className={META_VALUE_CLASS_NAME}>{locality || "—"}</dd>
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <dt className={META_LABEL_CLASS_NAME}>Firma</dt>
            <dd className={META_VALUE_CLASS_NAME}>{lead.company || "Bez firmy"}</dd>
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <dt className={META_LABEL_CLASS_NAME}>AI skóre</dt>
            <dd className="min-w-0 font-mono text-sm text-text-primary">
              {lead.ai_score}
              <span className="text-xs text-text-muted"> / 100</span>
            </dd>
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <dt className={META_LABEL_CLASS_NAME}>Vytvořeno</dt>
            <dd className="min-w-0 font-mono text-xs break-words text-text-secondary">
              {formatDateTime(lead.created_at)}
            </dd>
          </div>
        </dl>

        {lead.notes ? (
          <>
            <Separator />
            <div className="flex flex-col gap-1.5">
              <h3 className={SUBHEADING_CLASS_NAME}>Poznámka v záznamu</h3>
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-text-secondary">
                {lead.notes}
              </p>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}