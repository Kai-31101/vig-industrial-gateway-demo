export type Language = 'vi' | 'en';
export type LocalizedText = { vi: string; en: string };
export type VerificationStatus = 'unverified' | 'reviewed' | 'verified';
export type DisclosureStatus = 'public' | 'not_disclosed' | 'not_available';

export interface SourcedValue<T> {
  value: T | null;
  unit?: string;
  asOf?: string;
  sourceDocumentId?: string;
  verificationStatus: VerificationStatus;
  disclosureStatus: DisclosureStatus;
  calculated?: boolean;
}

export type ParkStatus = 'operational' | 'developing' | 'planned';
export type PublicationStatus = 'draft' | 'in_review' | 'published' | 'archived';

export interface ParkPhase { name: LocalizedText; status: ParkStatus; area: SourcedValue<number>; availableFrom?: string; }
export interface ParkAvailability { type: 'industrial_land' | 'ready_built_factory' | 'warehouse' | 'build_to_suit'; total: SourcedValue<number>; available: SourcedValue<number>; reserved: SourcedValue<number>; occupied: SourcedValue<number>; minimumPlot?: SourcedValue<number>; transactionModes: ('lease' | 'sale')[]; availableFrom?: string; }
export interface InfrastructureUtility { key: string; label: LocalizedText; capacity: SourcedValue<number | string>; note?: LocalizedText; }
export interface ConnectivityPoint { type: 'port' | 'airport' | 'road' | 'rail' | 'city' | 'logistics'; name: LocalizedText; distanceKm?: SourcedValue<number>; travelTime?: LocalizedText; status: 'operational' | 'construction' | 'planned'; completionYear?: number; details?: LocalizedText; }
export interface InvestmentIncentive { name: LocalizedText; schedule: { label: LocalizedText; rate: string; years: string }[]; eligibility: LocalizedText; effectiveDate: string; sourceDocumentId: string; }
export interface InvestmentProcessStep { order: number; title: LocalizedText; authority: LocalizedText; duration: LocalizedText; payment?: string; output: LocalizedText; }
export interface ParkDocument { id: string; title: LocalizedText; category: 'brochure' | 'presentation' | 'masterplan' | 'establishment_decision' | 'enterprise_registration' | 'legal_approval'; issuer: LocalizedText; issueDate?: string; language: Language | 'multi'; version?: string; visibility: 'public' | 'verified_member' | 'admin_only'; verificationStatus: VerificationStatus; sourceUrl?: string; }
export interface ParkMedia { id: string; type: 'hero' | 'gallery' | 'site_photo' | 'masterplan' | 'map' | 'video'; title: LocalizedText; url: string; capturedAt?: string; approved: boolean; }
export interface ParkContact { office: LocalizedText; address: LocalizedText; person: string; title: LocalizedText; phone: string; email: string; website: string; channels: string[]; }
export interface IndustrialParkOperator { name: string; overview: LocalizedText; ownership: LocalizedText; establishedYear: number; website: string; portfolioStats: { label: LocalizedText; value: SourcedValue<number> }[]; certifications: string[]; }
export interface ProvinceEconomicProfile { province: LocalizedText; population: SourcedValue<number>; grdp: SourcedValue<number>; growthRate: SourcedValue<number>; wageZone: string; context: LocalizedText; }
export interface WorkforceProfile { laborForce: SourcedValue<number>; skilledLabor: SourcedValue<number>; catchmentRadiusKm: number; catchmentPopulation: SourcedValue<number>; trainingInstitutions: string[]; salaryBenchmark: { role: LocalizedText; rangeUsd: string }[]; }
export interface LogisticsProfile { portCapacityDwt?: SourcedValue<number>; cargoThroughput?: SourcedValue<number>; shippingRoutes: { destination: string; time: string; frequency?: string }[]; indicativeCosts: { container: string; usd: SourcedValue<number> }[]; }

export interface IndustrialParkProfile {
  id: string; slug: string; name: LocalizedText; summary: LocalizedText; logoText: string;
  status: ParkStatus; parkType: LocalizedText; establishmentYear: number; publicationStatus: PublicationStatus;
  totalArea: SourcedValue<number>; industrialLandArea: SourcedValue<number>; coordinates: { lat: number; lng: number } | null;
  address: LocalizedText; economicZone: LocalizedText; region: 'North' | 'Central' | 'South'; province: string;
  operator: IndustrialParkOperator; provinceProfile: ProvinceEconomicProfile; workforce: WorkforceProfile;
  phases: ParkPhase[]; availability: ParkAvailability[]; connectivity: ConnectivityPoint[]; utilities: InfrastructureUtility[];
  amenities: LocalizedText[]; suitableIndustries: string[]; restrictedIndustries: string[]; environmentalConditions: LocalizedText;
  incentives: InvestmentIncentive[]; process: InvestmentProcessStep[]; logistics: LogisticsProfile;
  sustainability: LocalizedText[]; community: LocalizedText[]; tenants: { name: string; origin: string; sector: string; displayAllowed: boolean }[];
  contact: ParkContact | null; media: ParkMedia[]; documents: ParkDocument[];
  sourceLanguage: Language; dataOwner: string; lastVerifiedAt?: string; verifiedBy?: string;
  conflicts?: { field: string; primary: string; secondary: string; sources: string[] }[];
}

export interface IndustrialAsset { id: string; parkId: string; name: LocalizedText; type: ParkAvailability['type']; area: number; unit: 'ha' | 'm²'; transaction: 'lease' | 'sale'; price: SourcedValue<number>; availableFrom: string; powerMva?: number; industries: string[]; featured: boolean; image: string; description: LocalizedText; }
export type RequestKind = 'find_demand' | 'find_supply';
export type RequestStatus = 'submitted' | 'under_review' | 'verified' | 'matching' | 'connection_scheduled' | 'closed' | 'rejected';
export interface RequestActivity { id: string; at: string; actor: string; action: LocalizedText; }
export interface IndustrialRequest { id: string; kind: RequestKind; organization: string; contactName: string; email: string; phone: string; service: string; assetType: string; location: string; areaMin: number; areaMax: number; transaction: 'lease' | 'sale'; budgetOrPrice: string; industry: string; availabilityDate: string; requirements: string; status: RequestStatus; submittedAt: string; assignedTo: string; activities: RequestActivity[]; rejectionReason?: string; }
export interface ExpoProgram { id: string; title: LocalizedText; market: string; industries: string[]; date: string; status: 'upcoming' | 'live'; exhibitors: number; }
