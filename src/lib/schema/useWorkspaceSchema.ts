"use client";

import { useCallback, useEffect, useState } from "react";
import { listSchemasAction } from "@/app/actions/schema";
import type { ObjectSchema } from "./types";

export function useWorkspaceSchema(slug: string, workspaceId?: string) {
  const [schema, setSchema] = useState<ObjectSchema | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const schemas = await listSchemasAction(workspaceId);
      setSchema(schemas.find((candidate) => candidate.slug === slug) || null);
    } catch (cause) {
      setSchema(null);
      setError(cause instanceof Error ? cause.message : "Schéma se nepodařilo načíst.");
    } finally {
      setIsLoading(false);
    }
  }, [slug, workspaceId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  return { schema, isLoading, error, refresh };
}
