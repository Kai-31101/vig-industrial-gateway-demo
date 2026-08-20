import { describe, expect, it } from "vitest";
import { translateToChinese, ui } from "./i18n";

describe("Chinese localization", () => {
  it("selects Chinese UI copy for the zh locale", () => {
    expect(ui("zh", "Khu công nghiệp", "Industrial parks")).toBe("工业园区");
    expect(ui("zh", "Chọn ngôn ngữ", "Select language")).toBe("选择语言");
  });

  it("keeps source content in English when no approved Chinese copy exists", () => {
    expect(translateToChinese("Authoritative source-only value")).toBe(
      "Authoritative source-only value",
    );
  });

  it("does not turn locale codes into display labels", () => {
    expect(translateToChinese("en")).toBe("en");
  });
});
