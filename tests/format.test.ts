import { formatKES, formatDate, formatDateRange } from "../src/lib/format";

describe("format utilities", () => {
  test("formatKES formats Kenyan shillings", () => {
    const result = formatKES(2500);
    expect(result).toContain("2,500");
  });

  test("formatDate returns a readable date", () => {
    const result = formatDate("2026-12-26");
    expect(result).toContain("26");
    expect(result).toContain("Dec");
  });

  test("formatDateRange same month", () => {
    const result = formatDateRange("2026-12-26", "2026-12-28");
    expect(result).toContain("26");
    expect(result).toContain("28");
    expect(result).toContain("Dec");
  });
});
