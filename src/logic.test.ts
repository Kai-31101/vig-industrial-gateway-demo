import { describe, expect, it } from "vitest";
import { assets, expos, parks, vsipThaiBinh } from "./data";
import {
  canPublish,
  canTransition,
  displaySourced,
  getParkStandardChecklist,
} from "./logic";

describe("industrial park dataset", () => {
  it("contains 22 source-linked industrial projects without synthetic parks", () => {
    expect(parks).toHaveLength(22);
    expect(parks.filter((p) => p.id.includes("demo"))).toHaveLength(0);
  });

  it("compares the VSIP reference profile against every standard data group", () => {
    const checklist = getParkStandardChecklist(vsipThaiBinh);
    expect(checklist).toHaveLength(20);
    expect(checklist.some((item) => item.status === "missing")).toBe(true);
    expect(canPublish(vsipThaiBinh)).toBe(false);
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

  it("keeps every published value traceable and unknown commercial facts empty", () => {
    for (const park of parks) {
      expect(park.documents[0].sourceUrl).toMatch(/^https:\/\/www.vsip.com.vn\/en\/project\//);
      expect(park.totalArea.sourceDocumentId).toBe(park.documents[0].id);
      expect(park.coordinates).toBeNull();
      expect(park.verifiedBy).toBeUndefined();
    }
    expect(vsipThaiBinh.availability[0].available.value).toBe(85);
    expect(parks.find(p => p.slug === 'vsip-ii-binh-duong')?.totalArea.value).toBe(2045);
    for (const asset of assets) {
      expect(asset.listingKind).toBe('project_inventory');
      expect(asset.price.value).toBeNull();
      expect(asset.availableFrom).toBe('');
      expect(asset.area).toBeGreaterThan(0);
    }
  });

  it("links asset industries and images to their owning park", () => {
    for (const asset of assets) {
      const park = parks.find((candidate) => candidate.id === asset.parkId);
      expect(park).toBeDefined();
      expect(asset.image).toBe(park?.media[0]?.url || "");
      expect(asset.industries).toEqual(park?.suitableIndustries.slice(0, 3));
    }
  });
});

describe("expo reporting fixtures", () => {
  it("provides consolidated I/O connection and deal metrics for every Expo", () => {
    for (const expo of expos) {
      const report = expo.analytics;
      expect(report.updatedAt).toBeTruthy();
      expect(report.trend.length).toBeGreaterThan(0);
      expect(report.trend.every((point) => point.requests >= 0)).toBe(true);
      expect(report.inboundRequests).toBeGreaterThanOrEqual(0);
      expect(report.outboundRequests).toBeGreaterThanOrEqual(0);
      expect("inboundRfqs" in report).toBe(false);
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
