"use server";

import { requireAuthenticatedUser } from "@/lib/auth/server";
import { computeAiAttribute } from "@/lib/schema/aiAttributes";
import type { AttributeDefinition, RecordEntity } from "@/lib/schema/types";

export async function computeAiAttributeAction(
  attribute: AttributeDefinition,
  record: RecordEntity
) {
  await requireAuthenticatedUser();

  if (!attribute || typeof attribute !== "object" || !record || typeof record !== "object") {
    throw new Error("Invalid AI attribute request");
  }

  return computeAiAttribute(attribute, record);
}
