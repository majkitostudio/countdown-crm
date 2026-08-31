import "server-only";

import type { Database } from "@/lib/supabase/types";
import { DEFAULT_SCHEMAS } from "@/lib/schema/defaults";
import type {
  AttributeDefinition,
  ObjectSchema,
  RecordEntity,
} from "@/lib/schema/types";
import { createDataClient } from "@/lib/dal/db";
import { DataAccessError } from "@/lib/dal/errors";
import { requireWorkspaceRole } from "@/lib/dal/workspace";

type CustomObjectRow = Database["public"]["Tables"]["custom_objects"]["Row"];
type AttributeDefinitionRow = Database["public"]["Tables"]["attribute_definitions"]["Row"];
type RecordEntityRow = Database["public"]["Tables"]["record_entities"]["Row"];
type RecordValueRow = Database["public"]["Tables"]["record_values"]["Row"];

const CUSTOM_OBJECT_SELECT =
  "slug, workspace_id, singular_name, plural_name, icon, description, created_at";
const ATTRIBUTE_SELECT =
  "id, workspace_id, object_slug, slug, name, data_type, options, is_ai, ai_prompt, created_at";
const ENTITY_SELECT = "id, workspace_id, object_slug, created_at, updated_at";
const VALUE_SELECT = "id, workspace_id, record_id, attribute_slug, value_json, created_at, updated_at";

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function mapAttribute(row: AttributeDefinitionRow): AttributeDefinition {
  const options = Array.isArray(row.options)
    ? (row.options as unknown as AttributeDefinition["options"])
    : undefined;

  return {
    id: row.id,
    key: row.slug,
    name: row.name,
    type: row.data_type as AttributeDefinition["type"],
    options,
    aiConfig: row.ai_prompt
      ? {
          promptTemplate: row.ai_prompt,
          contextSources: ["transcript", "lead_notes"],
          refreshTrigger: "on_call_end",
        }
      : undefined,
  };
}

function mapCustomObject(row: CustomObjectRow, attributes: AttributeDefinition[]): ObjectSchema {
  return {
    id: `schema-${row.slug}`,
    slug: row.slug,
    name: row.singular_name,
    description: row.description || "",
    iconName: row.icon || "Layers",
    attributes,
  };
}

function mapEntity(
  entity: RecordEntityRow,
  values: RecordValueRow[]
): RecordEntity {
  return {
    id: entity.id,
    schemaSlug: entity.object_slug,
    values: Object.fromEntries(
      values
        .filter((value) => value.record_id === entity.id)
        .map((value) => [value.attribute_slug, value.value_json])
    ),
    createdAt: entity.created_at,
    updatedAt: entity.updated_at,
  };
}

function validateAttribute(attribute: AttributeDefinition): AttributeDefinition {
  const key = normalizeSlug(attribute.key);
  const name = attribute.name.trim();

  if (!key || key.length > 100 || !name || name.length > 200) {
    throw new DataAccessError("VALIDATION", "Attribute key and name are required.");
  }

  return { ...attribute, key, name };
}

function validateSchema(schema: ObjectSchema): ObjectSchema {
  const slug = normalizeSlug(schema.slug);
  const name = schema.name.trim();

  if (!slug || slug.length > 100 || !name || name.length > 200) {
    throw new DataAccessError("VALIDATION", "Object slug and name are required.");
  }

  const attributes = schema.attributes.map(validateAttribute);
  if (new Set(attributes.map((attribute) => attribute.key)).size !== attributes.length) {
    throw new DataAccessError("VALIDATION", "Attribute keys must be unique.");
  }

  return {
    ...schema,
    id: `schema-${slug}`,
    slug,
    name,
    description: schema.description.trim(),
    attributes,
  };
}

async function assertSchemaInWorkspace(objectSlug: string, workspaceId: string) {
  const slug = normalizeSlug(objectSlug);
  if (DEFAULT_SCHEMAS.some((schema) => schema.slug === slug)) return slug;

  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("custom_objects")
    .select("slug")
    .eq("workspace_id", workspaceId)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new DataAccessError("DATABASE", "Unable to verify the selected object.");
  }
  if (!data) {
    throw new DataAccessError("NOT_FOUND", "Object not found in this workspace.");
  }

  return slug;
}

export async function listSchemasForWorkspace(requestedWorkspaceId?: string): Promise<ObjectSchema[]> {
  const { workspaceId } = await requireWorkspaceRole(["team_leader", "administrator"], requestedWorkspaceId);
  const supabase = await createDataClient();
  const [{ data: objects, error: objectError }, { data: attributes, error: attributeError }] =
    await Promise.all([
      supabase
        .from("custom_objects")
        .select(CUSTOM_OBJECT_SELECT)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: true }),
      supabase
        .from("attribute_definitions")
        .select(ATTRIBUTE_SELECT)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: true }),
    ]);

  if (objectError || attributeError) {
    throw new DataAccessError("DATABASE", "Unable to load object schemas.");
  }

  const attributeRows = (attributes || []) as AttributeDefinitionRow[];
  const attributesBySlug = new Map<string, AttributeDefinition[]>();
  for (const row of attributeRows) {
    const current = attributesBySlug.get(row.object_slug) || [];
    current.push(mapAttribute(row));
    attributesBySlug.set(row.object_slug, current);
  }

  const schemas = new Map(DEFAULT_SCHEMAS.map((schema) => [schema.slug, schema]));
  for (const [slug, schema] of schemas) {
    const customAttributes = attributesBySlug.get(slug) || [];
    if (customAttributes.length > 0) {
      const byKey = new Map(customAttributes.map((attribute) => [attribute.key, attribute]));
      schemas.set(slug, {
        ...schema,
        attributes: schema.attributes.map((attribute) => byKey.get(attribute.key) || attribute)
          .concat(customAttributes.filter((attribute) => !schema.attributes.some((item) => item.key === attribute.key))),
      });
    }
  }

  for (const object of (objects || []) as CustomObjectRow[]) {
    if (!schemas.has(object.slug)) {
      schemas.set(object.slug, mapCustomObject(object, attributesBySlug.get(object.slug) || []));
    } else {
      const builtIn = schemas.get(object.slug)!;
      schemas.set(object.slug, {
        ...builtIn,
        name: object.singular_name,
        description: object.description || builtIn.description,
        iconName: object.icon || builtIn.iconName,
      });
    }
  }

  return Array.from(schemas.values());
}

export async function saveSchemaForWorkspace(
  schema: ObjectSchema,
  requestedWorkspaceId?: string
): Promise<ObjectSchema> {
  const { workspaceId } = await requireWorkspaceRole(["team_leader", "administrator"], requestedWorkspaceId);
  const validated = validateSchema(schema);
  const supabase = await createDataClient();

  const { data: object, error: objectError } = await supabase
    .from("custom_objects")
    .upsert({
      workspace_id: workspaceId,
      slug: validated.slug,
      singular_name: validated.name,
      plural_name: `${validated.name}s`,
      icon: validated.iconName || "Layers",
      description: validated.description || null,
    })
    .select(CUSTOM_OBJECT_SELECT)
    .single();

  if (objectError || !object) {
    throw new DataAccessError("DATABASE", "Unable to save the object schema.");
  }

  if (validated.attributes.length > 0) {
    const { error: attributeError } = await supabase
      .from("attribute_definitions")
      .upsert(
        validated.attributes.map((attribute) => ({
          object_slug: validated.slug,
          workspace_id: workspaceId,
          slug: attribute.key,
          name: attribute.name,
          data_type: attribute.type,
          options: attribute.options ? JSON.parse(JSON.stringify(attribute.options)) : null,
          is_ai: !!attribute.aiConfig,
          ai_prompt: attribute.aiConfig?.promptTemplate || null,
        })),
        { onConflict: "object_slug,slug" }
      );

    if (attributeError) {
      throw new DataAccessError("DATABASE", "Unable to save the object attributes.");
    }
  }

  return mapCustomObject(object as CustomObjectRow, validated.attributes);
}

export async function saveAttributeForWorkspace(
  objectSlug: string,
  attribute: AttributeDefinition,
  requestedWorkspaceId?: string
): Promise<AttributeDefinition> {
  const { workspaceId } = await requireWorkspaceRole(["team_leader", "administrator"], requestedWorkspaceId);
  const slug = await assertSchemaInWorkspace(objectSlug, workspaceId);
  const validated = validateAttribute(attribute);
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("attribute_definitions")
    .upsert(
      {
        object_slug: slug,
        workspace_id: workspaceId,
        slug: validated.key,
        name: validated.name,
        data_type: validated.type,
        options: validated.options ? JSON.parse(JSON.stringify(validated.options)) : null,
        is_ai: !!validated.aiConfig,
        ai_prompt: validated.aiConfig?.promptTemplate || null,
      },
      { onConflict: "object_slug,slug" }
    )
    .select(ATTRIBUTE_SELECT)
    .single();

  if (error || !data) {
    throw new DataAccessError("DATABASE", "Unable to save the object attribute.");
  }

  return mapAttribute(data as AttributeDefinitionRow);
}

export async function deleteSchemaForWorkspace(
  objectSlug: string,
  requestedWorkspaceId?: string
): Promise<void> {
  const { workspaceId } = await requireWorkspaceRole(["team_leader", "administrator"], requestedWorkspaceId);
  const slug = normalizeSlug(objectSlug);

  if (DEFAULT_SCHEMAS.some((schema) => schema.slug === slug)) {
    throw new DataAccessError("VALIDATION", "Built-in schemas cannot be deleted.");
  }

  await assertSchemaInWorkspace(slug, workspaceId);
  const supabase = await createDataClient();
  const { count, error: entityError } = await supabase
    .from("record_entities")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("object_slug", slug);

  if (entityError) {
    throw new DataAccessError("DATABASE", "Unable to verify object records.");
  }
  if ((count || 0) > 0) {
    throw new DataAccessError("VALIDATION", "Objects with records cannot be deleted.");
  }

  const { error: attributeError } = await supabase
    .from("attribute_definitions")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("object_slug", slug);

  if (attributeError) {
    throw new DataAccessError("DATABASE", "Unable to delete object attributes.");
  }

  const { error: objectError } = await supabase
    .from("custom_objects")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("slug", slug);

  if (objectError) {
    throw new DataAccessError("DATABASE", "Unable to delete the object schema.");
  }
}

export async function listRecordsForWorkspace(
  objectSlug: string,
  requestedWorkspaceId?: string
): Promise<RecordEntity[]> {
  const { workspaceId } = await requireWorkspaceRole(["team_leader", "administrator"], requestedWorkspaceId);
  const slug = await assertSchemaInWorkspace(objectSlug, workspaceId);
  const supabase = await createDataClient();
  const { data: entities, error: entityError } = await supabase
    .from("record_entities")
    .select(ENTITY_SELECT)
    .eq("workspace_id", workspaceId)
    .eq("object_slug", slug)
    .order("created_at", { ascending: false })
    .limit(500);

  if (entityError) {
    throw new DataAccessError("DATABASE", "Unable to load object records.");
  }

  const entityRows = (entities || []) as RecordEntityRow[];
  if (entityRows.length === 0) return [];

  const { data: values, error: valueError } = await supabase
    .from("record_values")
    .select(VALUE_SELECT)
    .eq("workspace_id", workspaceId)
    .in("record_id", entityRows.map((entity) => entity.id));

  if (valueError) {
    throw new DataAccessError("DATABASE", "Unable to load object record values.");
  }

  return entityRows.map((entity) => mapEntity(entity, (values || []) as RecordValueRow[]));
}

export async function createRecordForWorkspace(
  objectSlug: string,
  values: Record<string, unknown>,
  requestedWorkspaceId?: string
): Promise<RecordEntity> {
  const { workspaceId } = await requireWorkspaceRole(["team_leader", "administrator"], requestedWorkspaceId);
  const slug = await assertSchemaInWorkspace(objectSlug, workspaceId);
  const supabase = await createDataClient();
  const { data: entity, error: entityError } = await supabase
    .from("record_entities")
    .insert({ object_slug: slug, workspace_id: workspaceId })
    .select(ENTITY_SELECT)
    .single();

  if (entityError || !entity) {
    throw new DataAccessError("DATABASE", "Unable to create the object record.");
  }

  const entityRow = entity as RecordEntityRow;
  const valueRows = Object.entries(values).map(([attributeSlug, value]) => ({
    record_id: entityRow.id,
    workspace_id: workspaceId,
    attribute_slug: normalizeSlug(attributeSlug),
    value_json: JSON.parse(JSON.stringify(value ?? null)),
  }));

  if (valueRows.length > 0) {
    const { error: valueError } = await supabase.from("record_values").insert(valueRows);
    if (valueError) {
      throw new DataAccessError("DATABASE", "Unable to save the object record values.");
    }
  }

  return {
    id: entityRow.id,
    schemaSlug: slug,
    values,
    createdAt: entityRow.created_at,
    updatedAt: entityRow.updated_at,
  };
}
