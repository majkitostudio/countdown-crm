import { createClient } from "./client";
import { Database } from "./types";
import { ObjectSchema, AttributeDefinition, RecordEntity } from "../schema/types";

type CustomObjectRow = Database["public"]["Tables"]["custom_objects"]["Row"];
type AttributeDefinitionRow = Database["public"]["Tables"]["attribute_definitions"]["Row"];
type RecordEntityRow = Database["public"]["Tables"]["record_entities"]["Row"];
type RecordValueRow = Database["public"]["Tables"]["record_values"]["Row"];

function getDb() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient() as any;
}

/**
 * Supabase Service for Attio-Grade Dynamic Schemas, EAV Custom Attributes & Records
 */
export async function fetchCustomObjectsFromSupabase(): Promise<ObjectSchema[]> {
  const supabase = getDb();

  const { data: objects, error: objError } = await supabase
    .from("custom_objects")
    .select("*");

  if (objError || !objects || objects.length === 0) {
    return [];
  }

  const { data: attrs, error: attrError } = await supabase
    .from("attribute_definitions")
    .select("*");

  if (attrError) {
    console.warn("[schemaService] Failed to load attribute definitions from Supabase:", attrError);
  }

  const result: ObjectSchema[] = (objects as CustomObjectRow[]).map((obj) => {
    const objectAttrs = (attrs as AttributeDefinitionRow[] || [])
      .filter((a) => a.object_slug === obj.slug)
      .map((a) => {
        let optionsArray = undefined;
        if (a.options && Array.isArray(a.options)) {
          optionsArray = a.options as Array<{ label: string; value: string; color?: string }>;
        }

        const attrDef: AttributeDefinition = {
          id: a.id,
          key: a.slug,
          name: a.name,
          type: a.data_type as AttributeDefinition["type"],
          options: optionsArray,
          aiConfig: a.ai_prompt
            ? {
                promptTemplate: a.ai_prompt,
                contextSources: ["transcript", "lead_notes"],
                refreshTrigger: "on_call_end",
              }
            : undefined,
        };
        return attrDef;
      });

    return {
      id: `schema-${obj.slug}`,
      slug: obj.slug,
      name: obj.singular_name,
      description: obj.description || "",
      iconName: obj.icon || "Layers",
      attributes: objectAttrs,
    };
  });

  return result;
}

export async function saveCustomObjectToSupabase(schema: ObjectSchema): Promise<boolean> {
  const supabase = getDb();

  const { error: objError } = await supabase.from("custom_objects").upsert({
    slug: schema.slug,
    singular_name: schema.name,
    plural_name: `${schema.name}s`,
    icon: schema.iconName || "Layers",
    description: schema.description || null,
  });

  if (objError) {
    console.error("[schemaService] Error saving custom object to Supabase:", objError);
    return false;
  }

  if (schema.attributes && schema.attributes.length > 0) {
    const attrRows = schema.attributes.map((attr) => ({
      object_slug: schema.slug,
      slug: attr.key,
      name: attr.name,
      data_type: attr.type,
      options: attr.options ? JSON.parse(JSON.stringify(attr.options)) : null,
      is_ai: !!attr.aiConfig,
      ai_prompt: attr.aiConfig?.promptTemplate || null,
    }));

    const { error: attrError } = await supabase
      .from("attribute_definitions")
      .upsert(attrRows, { onConflict: "object_slug,slug" });

    if (attrError) {
      console.error("[schemaService] Error saving attributes to Supabase:", attrError);
    }
  }

  return true;
}

export async function saveAttributeDefinitionToSupabase(
  objectSlug: string,
  attr: AttributeDefinition
): Promise<boolean> {
  const supabase = getDb();

  const { error } = await supabase.from("attribute_definitions").upsert({
    object_slug: objectSlug,
    slug: attr.key,
    name: attr.name,
    data_type: attr.type,
    options: attr.options ? JSON.parse(JSON.stringify(attr.options)) : null,
    is_ai: !!attr.aiConfig,
    ai_prompt: attr.aiConfig?.promptTemplate || null,
  }, { onConflict: "object_slug,slug" });

  if (error) {
    console.error("[schemaService] Error adding attribute definition to Supabase:", error);
    return false;
  }

  return true;
}

export async function fetchRecordEntitiesFromSupabase(objectSlug: string): Promise<RecordEntity[]> {
  const supabase = getDb();

  const { data: entities, error: entError } = await supabase
    .from("record_entities")
    .select("*")
    .eq("object_slug", objectSlug);

  if (entError || !entities || entities.length === 0) {
    return [];
  }

  const typedEntities = entities as RecordEntityRow[];
  const recordIds = typedEntities.map((e) => e.id);

  const { data: values, error: valError } = await supabase
    .from("record_values")
    .select("*")
    .in("record_id", recordIds);

  if (valError) {
    console.warn("[schemaService] Failed to load record values from Supabase:", valError);
  }

  const typedValues = (values || []) as RecordValueRow[];

  const records: RecordEntity[] = typedEntities.map((e) => {
    const recordVals: Record<string, unknown> = {};
    typedValues
      .filter((v) => v.record_id === e.id)
      .forEach((v) => {
        recordVals[v.attribute_slug] = v.value_json;
      });

    return {
      id: e.id,
      schemaSlug: e.object_slug,
      values: recordVals,
      createdAt: e.created_at,
      updatedAt: e.updated_at,
    };
  });

  return records;
}

export async function saveRecordEntityToSupabase(
  objectSlug: string,
  values: Record<string, unknown>
): Promise<RecordEntity | null> {
  const supabase = getDb();

  const { data: entity, error: entError } = await supabase
    .from("record_entities")
    .insert({ object_slug: objectSlug })
    .select()
    .single();

  if (entError || !entity) {
    console.error("[schemaService] Failed to insert record entity into Supabase:", entError);
    return null;
  }

  const typedEntity = entity as RecordEntityRow;

  const valueRows = Object.entries(values).map(([attrSlug, val]) => ({
    record_id: typedEntity.id,
    attribute_slug: attrSlug,
    value_json: JSON.parse(JSON.stringify(val ?? null)),
  }));

  if (valueRows.length > 0) {
    const { error: valError } = await supabase.from("record_values").insert(valueRows);
    if (valError) {
      console.error("[schemaService] Failed to insert record values into Supabase:", valError);
    }
  }

  return {
    id: typedEntity.id,
    schemaSlug: objectSlug,
    values,
    createdAt: typedEntity.created_at,
    updatedAt: typedEntity.updated_at,
  };
}
