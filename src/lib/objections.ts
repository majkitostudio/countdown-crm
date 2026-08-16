export interface ObjectionBattleCard {
  id: string;
  product_id: string | null;
  objection_title: string;
  rebuttal_arguments: string[];
  created_at: string;
}

export interface MatchedObjection {
  matchedTitle: string;
  matchScore: number;
  rebuttalArgs: string[];
}

function normalize(value: string | null | undefined): string {
  return value?.trim().toLowerCase() || "";
}

function meaningfulTokens(value: string): string[] {
  return normalize(value)
    .split(/\s+/)
    .filter((token) => token.length >= 4);
}

/** Match only against persisted approved cards; never invent a fallback script. */
export function matchObjectionToProduct(
  detectedObjection: string | null,
  cards: ObjectionBattleCard[]
): MatchedObjection {
  const detected = normalize(detectedObjection);
  const found = detected
    ? cards.find((card) => {
        const title = normalize(card.objection_title);
        if (title.includes(detected) || detected.includes(title)) return true;

        const titleTokens = meaningfulTokens(title);
        return meaningfulTokens(detected).some((token) => titleTokens.includes(token));
      })
    : undefined;

  if (found) {
    return {
      matchedTitle: found.objection_title,
      matchScore: 90,
      rebuttalArgs: found.rebuttal_arguments,
    };
  }

  return {
    matchedTitle: detectedObjection || "No detected objection",
    matchScore: 0,
    rebuttalArgs: [],
  };
}
