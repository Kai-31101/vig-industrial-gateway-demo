import { describe, expect, it } from "vitest";
import { translateToChinese, ui } from "./i18n";
import { assets, expos, parks } from "./data";

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

  it("provides Chinese content for every seeded park, asset, and Expo", () => {
    const containsChinese = (value?: string) => expect(value).toMatch(/[\u3400-\u9fff]/);

    parks.forEach((park) => {
      [park.name, park.summary, park.parkType, park.operator.overview].forEach(
        (value) => containsChinese(value.zh),
      );
      park.utilities.forEach((utility) => containsChinese(utility.label.zh));
      park.process.forEach((step) => containsChinese(step.title.zh));
      park.documents.forEach((document) => containsChinese(document.title.zh));
    });
    assets.forEach((asset) => {
      containsChinese(asset.name.zh);
      containsChinese(asset.description.zh);
    });
    expos.forEach((expo) => containsChinese(expo.title.zh));
  });
});
