import { describe, expect, it } from "vitest";
import { escapeCsvField } from "@/lib/analyticsExport";

function parseSingleCsvField(value: string): string {
  if (!value.startsWith('"')) return value;

  expect(value.endsWith('"')).toBe(true);
  return value.slice(1, -1).replace(/""/g, '"');
}

describe("analytics CSV export", () => {
  it.each([
    ["", ""],
    ["Jane Doe", "Jane Doe"],
    ["Doe, Jane", '"Doe, Jane"'],
    ['Jane "Janie" Doe', '"Jane ""Janie"" Doe"'],
    ["Jane\r\nDoe", '"Jane\r\nDoe"'],
    ['Doe, "Janie"\r\n', '"Doe, ""Janie""\r\n"'],
  ])("escapes and round-trips %j", (name, expected) => {
    const escaped = escapeCsvField(name);

    expect(escaped).toBe(expected);
    expect(parseSingleCsvField(escaped)).toBe(name);
  });
});
