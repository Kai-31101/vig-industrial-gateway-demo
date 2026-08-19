import { describe, expect, it } from "vitest";
import { assets, expos, parks, vsipThaiBinh } from "./data";
import {
  canPublish,
  canTransition,
  displaySourced,
  getParkStandardChecklist,
} from "./logic";

describe("industrial park dataset", () => {
  it("contains one full reference profile and 19 labelled demo parks", () => {
    expect(parks).toHaveLength(20);
    expect(parks.filter((p) => p.id.includes("demo"))).toHaveLength(19);
  });

  it("compares the VSIP reference profile against every standard data group", () => {
    const checklist = getParkStandardChecklist(vsipThaiBinh);
    expect(checklist).toHaveLength(20);
    expect(checklist.every((item) => item.status !== "missing")).toBe(true);
    expect(canPublish(vsipThaiBinh)).toBe(true);
  });

  it("reports available, partial and missing groups without calculating a score", () => {
    const checklist = getParkStandardChecklist(parks[4]);
    expect(checklist.some((item) => item.status === "available")).toBe(true);
    expect(checklist.some((item) => item.status === "partial")).toBe(true);
    expect(checklist.some((item) => item.status === "missing")).toBe(true);
    expect(checklist.every((item) => !("score" in item))).toBe(true);
  });

  it("does not convert missing data to zero", () => {
    const value = {
      value: null,
      unit: "people",
      verificationStatus: "unverified" as const,
      disclosureStatus: "not_available" as const,
    };
    expect(displaySourced(value, "en")).toBe("Not available");
    expect(displaySourced(value, "vi")).toBe("Chưa có dữ liệu");
  });

  it("distinguishes not disclosed from unavailable", () => {
    const value = {
      value: null,
      unit: "USD",
      verificationStatus: "reviewed" as const,
      disclosureStatus: "not_disclosed" as const,
    };
    expect(displaySourced(value, "en")).toBe("Not disclosed");
  });

  it("localises common industrial units in Vietnamese", () => {
    const value = {
      value: 16500,
      unit: "m³/day",
      verificationStatus: "verified" as const,
      disclosureStatus: "public" as const,
    };
    expect(displaySourced(value, "vi")).toBe("16.500 m³/ngày");
    expect(displaySourced(value, "en")).toBe("16,500 m³/day");
  });

  it("gives every demo park a specific industry profile and sector imagery", () => {
    const demos = parks.filter((park) => park.id.includes("demo"));
    const industryProfiles = new Set(
      demos.map((park) => park.suitableIndustries.join("|")),
    );
    const heroImages = new Set(demos.map((park) => park.media[0]?.url));

    expect(industryProfiles.size).toBe(19);
    expect(heroImages.size).toBeGreaterThanOrEqual(7);
    expect(demos.every((park) => park.media.length >= 2)).toBe(true);
  });

  it("links asset industries and images to their owning park", () => {
    for (const asset of assets) {
      const park = parks.find((candidate) => candidate.id === asset.parkId);
      expect(park).toBeDefined();
      expect(asset.image).toBe(park?.media[0]?.url);
      expect(asset.industries).toEqual(park?.suitableIndustries.slice(0, 3));
    }
  });
});

describe("expo reporting fixtures", () => {
  it("provides traceable I/O RFQ and deal metrics for every Expo", () => {
    for (const expo of expos) {
      const report = expo.analytics;
      expect(report.updatedAt).toBeTruthy();
      expect(report.trend.length).toBeGreaterThan(0);
      expect(report.inboundRfqs).toBeGreaterThanOrEqual(0);
      expect(report.outboundRfqs).toBeGreaterThanOrEqual(0);
      expect(report.inboundDeals).toBeGreaterThanOrEqual(0);
      expect(report.outboundDeals).toBeGreaterThanOrEqual(0);
      expect(report.completedConnections).toBeLessThanOrEqual(report.activeConnections);
    }
  });
});

describe("request workflow", () => {
  it("allows only adjacent happy-path transitions", () => {
    expect(canTransition("submitted", "under_review")).toBe(true);
    expect(canTransition("submitted", "matching")).toBe(false);
    expect(canTransition("matching", "connection_scheduled")).toBe(true);
    expect(canTransition("closed", "matching")).toBe(false);
  });

  it("permits rejection only during review", () => {
    expect(canTransition("under_review", "rejected")).toBe(true);
    expect(canTransition("verified", "rejected")).toBe(false);
  });
});
