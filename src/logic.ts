import type { IndustrialParkProfile, Language, RequestStatus } from "./types";
import { ui } from "./i18n";

export const requestTransitions: Record<RequestStatus, RequestStatus[]> = {
  submitted: ["under_review"],
  under_review: ["verified", "rejected"],
  verified: ["matching"],
  matching: ["connection_scheduled"],
  connection_scheduled: ["closed"],
  closed: [],
  rejected: [],
};

export function canTransition(from: RequestStatus, to: RequestStatus) {
  return requestTransitions[from].includes(to);
}

export type StandardChecklistStatus = "available" | "partial" | "missing";

export interface ParkStandardChecklistItem {
  key: string;
  status: StandardChecklistStatus;
  requiredForPublication: boolean;
}

const statusFrom = (available: boolean, partial = false): StandardChecklistStatus =>
  available ? "available" : partial ? "partial" : "missing";

export function getParkStandardChecklist(
  park: IndustrialParkProfile,
): ParkStandardChecklistItem[] {
  const utilityKeys = new Set(park.utilities.map((item) => item.key));
  const coreUtilities = ["electricity", "water", "wastewater"];
  const connectivityTypes = new Set(park.connectivity.map((item) => item.type));
  const hasGateway = connectivityTypes.has("port") || connectivityTypes.has("airport");
  const approvedMedia = park.media.filter((item) => item.approved);
  const hasVerifiedLegalDocument = park.documents.some(
    (item) =>
      item.verificationStatus === "verified" &&
      ["establishment_decision", "enterprise_registration", "legal_approval"].includes(
        item.category,
      ),
  );

  return [
    { key: "identity", status: statusFrom(Boolean(park.name.vi && park.name.en && park.summary.vi && park.status && park.parkType.vi && park.totalArea.value !== null), Boolean(park.name.vi || park.name.en)), requiredForPublication: true },
    { key: "operator", status: statusFrom(Boolean(park.operator.name && park.operator.overview.vi && park.operator.website), Boolean(park.operator.name)), requiredForPublication: true },
    { key: "location", status: statusFrom(Boolean(park.coordinates && park.address.vi && park.province), Boolean(park.address.vi || park.province)), requiredForPublication: true },
    { key: "provincial_context", status: statusFrom(park.provinceProfile.population.value !== null && park.provinceProfile.grdp.value !== null && park.provinceProfile.growthRate.value !== null, Boolean(park.provinceProfile.context.vi)), requiredForPublication: false },
    { key: "workforce", status: statusFrom(park.workforce.laborForce.value !== null && park.workforce.skilledLabor.value !== null && park.workforce.trainingInstitutions.length > 0, park.workforce.laborForce.disclosureStatus !== "public" || park.workforce.trainingInstitutions.length > 0), requiredForPublication: false },
    { key: "land_availability", status: statusFrom(park.availability.length > 0 && park.availability.some((item) => item.available.value !== null), park.availability.length > 0), requiredForPublication: true },
    { key: "masterplan", status: statusFrom(approvedMedia.some((item) => item.type === "masterplan"), approvedMedia.length > 0), requiredForPublication: false },
    { key: "connectivity", status: statusFrom(hasGateway && connectivityTypes.has("road"), park.connectivity.length > 0), requiredForPublication: true },
    { key: "infrastructure", status: statusFrom(coreUtilities.every((key) => utilityKeys.has(key)), park.utilities.length > 0), requiredForPublication: true },
    { key: "amenities", status: statusFrom(park.amenities.length > 0), requiredForPublication: false },
    { key: "target_industries", status: statusFrom(park.suitableIndustries.length > 0 && park.restrictedIndustries.length > 0, park.suitableIndustries.length > 0), requiredForPublication: true },
    { key: "incentives", status: statusFrom(park.incentives.length > 0), requiredForPublication: false },
    { key: "investment_process", status: statusFrom(park.process.length >= 4, park.process.length > 0), requiredForPublication: false },
    { key: "logistics", status: statusFrom(Boolean(park.logistics.portCapacityDwt || park.logistics.cargoThroughput) && park.logistics.shippingRoutes.length > 0, park.logistics.shippingRoutes.length > 0 || park.logistics.indicativeCosts.length > 0), requiredForPublication: false },
    { key: "sustainability_community", status: statusFrom(park.sustainability.length > 0 && park.community.length > 0, park.sustainability.length > 0 || park.community.length > 0), requiredForPublication: false },
    { key: "existing_tenants", status: statusFrom(park.tenants.length > 0), requiredForPublication: false },
    { key: "contact", status: statusFrom(Boolean(park.contact?.email && park.contact?.phone), Boolean(park.contact)), requiredForPublication: true },
    { key: "media", status: statusFrom(approvedMedia.length > 0), requiredForPublication: true },
    { key: "legal_documents", status: statusFrom(hasVerifiedLegalDocument, park.documents.length > 0), requiredForPublication: true },
    { key: "data_governance", status: statusFrom(Boolean(park.sourceLanguage && park.dataOwner && park.lastVerifiedAt && park.verifiedBy), Boolean(park.dataOwner)), requiredForPublication: true },
  ];
}

export function canPublish(park: IndustrialParkProfile) {
  return getParkStandardChecklist(park)
    .filter((item) => item.requiredForPublication)
    .every((item) => item.status !== "missing");
}

export function displaySourced(
  value: { value: unknown; unit?: string; disclosureStatus: string },
  language: Language,
) {
  if (value.disclosureStatus === "not_disclosed")
    return ui(language, "Không công bố", "Not disclosed");
  if (value.disclosureStatus === "not_available" || value.value === null)
    return ui(language, "Chưa có dữ liệu", "Not available");
  const unitVi: Record<string, string> = {
    people: "người",
    "USD billion": "tỷ USD",
    "USD/month": "USD/tháng",
    "m wide": "m bề rộng",
    "m³/day": "m³/ngày",
    "million tonnes/year": "triệu tấn/năm",
  };
  const unit =
    value.unit && language === "vi"
      ? unitVi[value.unit] || value.unit
      : value.unit;
  const locale = language === "vi" ? "vi-VN" : language === "zh" ? "zh-CN" : "en-US";
  return `${typeof value.value === "number" ? value.value.toLocaleString(locale) : value.value}${unit ? ` ${unit}` : ""}`;
}
