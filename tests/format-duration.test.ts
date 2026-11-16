import { describe, expect, it } from "vitest";
import { formatDuration } from "@/lib/utils";

describe("formatDuration", () => {
  it("formats short durations as seconds or minutes and seconds", () => {
    expect(formatDuration(0)).toBe("0 s");
    expect(formatDuration(59)).toBe("59 s");
    expect(formatDuration(60)).toBe("1 m");
    expect(formatDuration(125)).toBe("2 m 5 s");
  });

  it("uses hours and minutes for durations under a day", () => {
    expect(formatDuration(3600)).toBe("1 h");
    expect(formatDuration(3665)).toBe("1 h 1 m");
    expect(formatDuration(86399)).toBe("23 h 59 m");
  });

  it("uses days and the next nonzero unit for long durations", () => {
    expect(formatDuration(86400)).toBe("1 d");
    expect(formatDuration(86400 + 4 * 60 + 49)).toBe("1 d 4 m");
    expect(formatDuration(39 * 86400 + 4 * 3600 + 4 * 60 + 49)).toBe("39 d 4 h");
  });

  it("does not present invalid or negative values as real durations", () => {
    expect(formatDuration(-1)).toBe("—");
    expect(formatDuration(Number.NaN)).toBe("—");
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe("—");
  });
});
