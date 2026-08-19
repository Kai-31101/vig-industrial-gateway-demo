import type { ExpoProgram, IndustrialAsset, IndustrialParkProfile, LocalizedText, SourcedValue } from './types';

const l = (vi: string, en: string): LocalizedText => ({ vi, en });
const s = <T,>(value: T | null, unit?: string, sourceDocumentId = 'vsip-vi-2026', disclosureStatus: SourcedValue<T>['disclosureStatus'] = value === null ? 'not_available' : 'public'): SourcedValue<T> => ({ value, unit, asOf: '2026-06-02', sourceDocumentId, verificationStatus: 'verified', disclosureStatus });

const hero = '/images/vig-industrial-hero.png';
const driveFolder = 'https://drive.google.com/drive/folders/1ctAxqVUcs6CNY_LFKc9aX6hVJ_wbN4DL?usp=sharing';

export const vsipThaiBinh: IndustrialParkProfile = {
  id: 'park-vsip-thai-binh', slug: 'vsip-thai-binh', name: l('Khu công nghiệp VSIP Thái Bình', 'VSIP Thai Binh Industrial Park'), logoText: 'VSIP',
  summary: l('Khu công nghiệp tích hợp tại cửa ngõ Hưng Yên – Hải Phòng, kết nối trực tiếp cảng biển, sân bay và mạng lưới cao tốc phía Bắc.', 'An integrated industrial park at the Hung Yen–Hai Phong gateway with direct access to northern ports, airports and expressways.'),
  status: 'operational', parkType: l('Khu công nghiệp tích hợp', 'Integrated industrial park'), establishmentYear: 2023, publicationStatus: 'published',
  totalArea: s(333.4, 'ha'), industrialLandArea: s(226.1, 'ha'), coordinates: { lat: 20.54, lng: 106.52 },
  address: l('Số 43 đường Lê Quý Đôn, xã Thái Thụy, tỉnh Hưng Yên', '43 Le Quy Don Road, Thai Thuy Commune, Hung Yen Province'),
  economicZone: l('Khu kinh tế Thái Bình', 'Thai Binh Economic Zone'), region: 'North', province: 'Hưng Yên',
  operator: {
    name: 'Vietnam Singapore Industrial Park (VSIP)', establishedYear: 1996, website: 'https://www.vsip.com.vn', certifications: ['ISO 9001', 'Integrated township development'],
    overview: l('Liên doanh phát triển khu công nghiệp và đô thị giữa Becamex IDC và liên danh Singapore do Sembcorp Development dẫn đầu.', 'A township and industrial park joint venture between Becamex IDC and a Singapore consortium led by Sembcorp Development.'),
    ownership: l('Becamex IDC và liên danh Singapore do Sembcorp Development dẫn đầu.', 'Becamex IDC and a Singapore consortium led by Sembcorp Development.'),
    portfolioStats: [
      { label: l('Khách hàng', 'Tenants'), value: s(1000, undefined, 'vsip-vi-2026') },
      { label: l('Việc làm tạo ra', 'Jobs created'), value: s(350000, undefined, 'vsip-vi-2026') },
      { label: l('Thu hút đầu tư', 'FDI attracted'), value: s(31.2, 'USD billion', 'vsip-vi-2026') },
      { label: l('Nền kinh tế', 'Economies represented'), value: s(30, undefined, 'vsip-vi-2026') },
    ],
  },
  provinceProfile: {
    province: l('Hưng Yên', 'Hung Yen'), population: s(3.5, 'million people'), grdp: s(6.3, 'USD billion'), growthRate: s(8.78, '%'), wageZone: 'III',
    context: l('Tỉnh thuộc Đồng bằng sông Hồng, liền kề Hải Phòng và mạng lưới công nghiệp phía Bắc.', 'A Red River Delta province adjoining Hai Phong and the northern industrial network.'),
  },
  workforce: {
    laborForce: s(1.7, 'million people'), skilledLabor: s(850000, 'people'), catchmentRadiusKm: 20, catchmentPopulation: s(627000, 'people'),
    trainingInstitutions: ['10 universities', '14 colleges', '10 vocational schools', '20 vocational centres'],
    salaryBenchmark: [
      { role: l('Công nhân phổ thông', 'General worker'), rangeUsd: 'USD 300–450/month' },
      { role: l('Lao động có tay nghề', 'Skilled worker'), rangeUsd: 'USD 450–650/month' },
      { role: l('Kỹ thuật viên biết ngoại ngữ', 'Skilled bilingual worker'), rangeUsd: 'USD 650–850/month' },
      { role: l('Quản lý cấp cao', 'Senior manager'), rangeUsd: 'USD 1,300–2,200/month' },
    ],
  },
  phases: [{ name: l('Giai đoạn 1', 'Phase 1'), status: 'operational', area: s(333.4, 'ha'), availableFrom: '2026-09-01' }],
  availability: [
    { type: 'industrial_land', total: s(226.1, 'ha'), available: s(88.5, 'ha'), reserved: s(24.6, 'ha'), occupied: s(113, 'ha'), minimumPlot: s(1, 'ha'), transactionModes: ['lease'], availableFrom: '2026-09-01' },
    { type: 'ready_built_factory', total: s<number>(null, 'm²', 'vsip-flyer-2026', 'not_disclosed'), available: s<number>(null, 'm²', 'vsip-flyer-2026', 'not_disclosed'), reserved: s<number>(null, 'm²', 'vsip-flyer-2026', 'not_disclosed'), occupied: s<number>(null, 'm²', 'vsip-flyer-2026', 'not_disclosed'), transactionModes: ['lease'] },
  ],
  connectivity: [
    { type: 'road', name: l('Đường ven biển', 'Coastal Road'), distanceKm: s(0, 'km'), travelTime: l('Tiếp cận trực tiếp', 'Direct access'), status: 'operational' },
    { type: 'road', name: l('Cao tốc Ninh Bình – Hải Phòng', 'Ninh Binh–Hai Phong Expressway'), distanceKm: s(0, 'km'), status: 'construction', completionYear: 2028 },
    { type: 'airport', name: l('Sân bay quốc tế Cát Bi', 'Cat Bi International Airport'), distanceKm: s(40, 'km'), travelTime: l('45 phút', '45 minutes'), status: 'operational' },
    { type: 'port', name: l('Cảng nước sâu Lạch Huyện', 'Lach Huyen Deep-water Port'), distanceKm: s(41, 'km'), travelTime: l('1 giờ', '1 hour'), status: 'operational', details: l('Tiếp nhận tàu 200.000 DWT', 'Handles vessels up to 200,000 DWT') },
    { type: 'city', name: l('Hà Nội', 'Hanoi'), distanceKm: s(125, 'km'), travelTime: l('2,5 giờ', '2.5 hours'), status: 'operational' },
    { type: 'rail', name: l('Đường sắt Côn Minh – Hà Nội – Hải Phòng', 'Kunming–Hanoi–Hai Phong Railway'), status: 'planned', completionYear: 2030 },
  ],
  utilities: [
    { key: 'roads', label: l('Đường nội bộ', 'Internal roads'), capacity: s('60 / 50 / 30', 'm wide') },
    { key: 'electricity', label: l('Cung cấp điện', 'Electricity supply'), capacity: s('2 × 63', 'MVA') },
    { key: 'water', label: l('Cấp nước', 'Water supply'), capacity: s(16500, 'm³/day') },
    { key: 'wastewater', label: l('Xử lý nước thải', 'Wastewater treatment'), capacity: s(9200, 'm³/day') },
    { key: 'telecom', label: l('Viễn thông', 'Telecommunications'), capacity: s('Fibre-ready') },
    { key: 'fire', label: l('Phòng cháy chữa cháy', 'Fire protection'), capacity: s('On-site station') },
  ],
  amenities: [l('Văn phòng điều hành', 'Administration office'), l('Ngân hàng, café và nhà hàng', 'Bank, café and restaurant'), l('Trung tâm thể thao', 'Sports centre'), l('Hỗ trợ tuyển dụng và thủ tục đầu tư', 'Recruitment and investment-procedure support')],
  suitableIndustries: ['Electronics', 'Semiconductors', 'Automotive', 'Supporting industries', 'Food processing', 'Logistics'], restrictedIndustries: ['Heavy polluting industries'],
  environmentalConditions: l('Dự án phải đáp ứng quy định môi trường và công suất xử lý nước thải của KCN.', 'Projects must meet environmental rules and the park wastewater-treatment capacity.'),
  incentives: [{
    name: l('Ưu đãi thuế thu nhập doanh nghiệp đặc biệt', 'Special corporate income tax incentive'), effectiveDate: '2026-06-02', sourceDocumentId: 'vsip-vi-2026',
    eligibility: l('Áp dụng theo điều kiện và phê duyệt hiện hành của dự án trong Khu kinh tế.', 'Subject to current project eligibility and approvals within the Economic Zone.'),
    schedule: [
      { label: l('Miễn thuế', 'Tax exemption'), rate: '0%', years: 'Years 0–4' },
      { label: l('Giảm 50%', '50% reduction'), rate: '5%', years: 'Years 5–13' },
      { label: l('Thuế ưu đãi', 'Preferential rate'), rate: '10%', years: 'Years 14–15' },
      { label: l('Thuế tiêu chuẩn', 'Standard rate'), rate: '20%', years: 'Year 16+' },
    ],
  }],
  process: [
    { order: 1, title: l('Ký thư chào thuê', 'Sign lease offer'), authority: l('VSIP', 'VSIP'), duration: l('Khởi tạo', 'Initiation'), payment: '10%', output: l('Thư chào thuê', 'Lease offer') },
    { order: 2, title: l('Xin thủ tục đầu tư', 'Investment approvals'), authority: l('Ban quản lý Khu kinh tế', 'Economic Zone Authority'), duration: l('2–3 tháng', '2–3 months'), payment: '30%', output: l('Chứng nhận đầu tư', 'Investment certificate') },
    { order: 3, title: l('Ký hợp đồng thuê lại đất', 'Sign sublease'), authority: l('VSIP', 'VSIP'), duration: l('Sau phê duyệt', 'After approval'), payment: '30%', output: l('Hợp đồng thuê lại đất', 'Land sublease agreement') },
    { order: 4, title: l('Bàn giao đất', 'Land handover'), authority: l('VSIP', 'VSIP'), duration: l('Theo hợp đồng', 'Per agreement'), payment: '30%', output: l('Biên bản bàn giao', 'Handover record') },
    { order: 5, title: l('Cấp quyền sử dụng đất', 'Land-use right procedure'), authority: l('Cơ quan có thẩm quyền', 'Competent authority'), duration: l('60–90 ngày', '60–90 days'), output: l('Giấy chứng nhận quyền sử dụng đất', 'Land-use right certificate') },
  ],
  logistics: {
    portCapacityDwt: s(200000, 'DWT'), cargoThroughput: s(120, 'million tonnes/year'),
    shippingRoutes: [{ destination: 'USA / Europe', time: '17–24 days', frequency: '8 sailings/week' }, { destination: 'Seoul / Incheon', time: '4h30', frequency: '7 flights/week' }, { destination: 'Bangkok', time: '1h40', frequency: '4 flights/week' }],
    indicativeCosts: [{ container: '20 ft', usd: s(136, 'USD') }, { container: '40 ft', usd: s(147, 'USD') }],
  },
  sustainability: [l('Hạ tầng xử lý nước thải tập trung', 'Central wastewater treatment'), l('Mái nhà xưởng sẵn sàng cho năng lượng mặt trời', 'Solar-ready factory roofs'), l('Phát triển khu công nghiệp xanh', 'Green industrial development')],
  community: [l('Ngày hội cộng đồng VSIP 2026', 'VSIP Community Day 2026'), l('Chương trình cải thiện điều kiện sống cho người lao động', 'Worker and family living-condition programmes')],
  tenants: [{ name: 'Representative electronics tenant', origin: 'Japan', sector: 'Electronics', displayAllowed: true }, { name: 'Representative logistics tenant', origin: 'Singapore', sector: 'Logistics', displayAllowed: true }],
  contact: { office: l('Văn phòng điều hành VSIP Thái Bình', 'VSIP Thai Binh Administration Office'), address: l('Xã Thái Thụy, tỉnh Hưng Yên', 'Thai Thuy Commune, Hung Yen Province'), person: 'VIG Demo Contact', title: l('Bộ phận Marketing & Dịch vụ khách hàng', 'Marketing & Customer Service'), phone: '(84) 888 766 280', email: 'north.marketing@vsip.com.vn', website: 'www.vsip.com.vn', channels: ['Email', 'Phone', 'Zalo', 'WhatsApp'] },
  media: [
    { id: 'media-hero', type: 'hero', title: l('Toàn cảnh khu công nghiệp', 'Industrial park aerial'), url: hero, capturedAt: '2026-06-02', approved: true },
    { id: 'media-masterplan', type: 'masterplan', title: l('Mặt bằng phân khu', 'Park masterplan'), url: hero, capturedAt: '2026-06-02', approved: true },
  ],
  documents: [
    { id: 'vsip-vi-2026', title: l('Hồ sơ giới thiệu VSIP Thái Bình', 'VSIP Thai Binh Profile'), category: 'presentation', issuer: l('VSIP', 'VSIP'), issueDate: '2026-06-02', language: 'vi', version: '2026.06', visibility: 'public', verificationStatus: 'verified', sourceUrl: driveFolder },
    { id: 'vsip-en-2026', title: l('Hồ sơ VSIP miền duyên hải', 'VSIP Coastal Projects Profile'), category: 'presentation', issuer: l('VSIP', 'VSIP'), issueDate: '2026-07-01', language: 'en', version: '2026.07', visibility: 'public', verificationStatus: 'reviewed', sourceUrl: driveFolder },
    { id: 'establishment-2023', title: l('Quyết định thành lập KCN', 'Industrial Park Establishment Decision'), category: 'establishment_decision', issuer: l('Thủ tướng Chính phủ', 'Prime Minister of Vietnam'), issueDate: '2023-08-30', language: 'vi', visibility: 'public', verificationStatus: 'verified', sourceUrl: driveFolder },
    { id: 'enterprise-registration', title: l('Giấy chứng nhận đăng ký doanh nghiệp', 'Enterprise Registration Certificate'), category: 'enterprise_registration', issuer: l('Cơ quan đăng ký kinh doanh', 'Business Registration Authority'), language: 'vi', visibility: 'admin_only', verificationStatus: 'verified', sourceUrl: driveFolder },
  ],
  sourceLanguage: 'vi', dataOwner: 'VIG Data Operations', lastVerifiedAt: '2026-08-19', verifiedBy: 'VIG Admin',
  conflicts: [],
};

const parkImages = {
  electronics: '/images/industrial-parks/electronics-semiconductor.png',
  automotive: '/images/industrial-parks/automotive-engineering.png',
  food: '/images/industrial-parks/food-cold-chain.png',
  textile: '/images/industrial-parks/textile-light-industry.png',
  logistics: '/images/industrial-parks/logistics-port.png',
  green: '/images/industrial-parks/green-energy.png',
  pharma: '/images/industrial-parks/pharma-biotech.png',
} as const;

interface DemoParkDefinition {
  province: string;
  name: LocalizedText;
  focus: LocalizedText;
  parkType: LocalizedText;
  industries: string[];
  restrictedIndustries: string[];
  image: keyof typeof parkImages;
  galleryImage: keyof typeof parkImages;
}

const demoParkDefinitions: DemoParkDefinition[] = [
  { province: 'Hải Phòng', name: l('KCN công nghệ Đông Hải (Mẫu)', 'Dong Hai Technology Industrial Park (Demo)'), focus: l('Cụm sản xuất điện tử xuất khẩu gắn với cảng biển và chuỗi cung ứng bán dẫn.', 'Export electronics cluster connected to seaports and the semiconductor supply chain.'), parkType: l('Khu công nghiệp công nghệ cao', 'High-tech industrial park'), industries: ['Electronics', 'Semiconductors', 'Precision engineering', 'Data centers'], restrictedIndustries: ['Heavy polluting industries'], image: 'electronics', galleryImage: 'logistics' },
  { province: 'Quảng Ninh', name: l('KCN năng lượng xanh Vân Hải (Mẫu)', 'Van Hai Green Energy Industrial Park (Demo)'), focus: l('Không gian công nghiệp xanh dành cho thiết bị năng lượng tái tạo và công nghệ điện.', 'Green manufacturing campus for renewable-energy equipment and electrical technology.'), parkType: l('Khu công nghiệp sinh thái', 'Eco-industrial park'), industries: ['Renewable energy equipment', 'Electrical equipment', 'Battery systems', 'Supporting industries'], restrictedIndustries: ['Uncontrolled high-emission production'], image: 'green', galleryImage: 'electronics' },
  { province: 'Bắc Ninh', name: l('KCN điện tử Kinh Bắc (Mẫu)', 'Kinh Bac Electronics Industrial Park (Demo)'), focus: l('Hệ sinh thái linh kiện điện tử, bo mạch và cơ khí chính xác cho doanh nghiệp FDI.', 'An FDI-oriented ecosystem for electronic components, circuit boards and precision engineering.'), parkType: l('Khu công nghiệp điện tử', 'Electronics industrial park'), industries: ['Electronic components', 'Semiconductors', 'Precision engineering', 'Industrial automation'], restrictedIndustries: ['Primary metal smelting'], image: 'electronics', galleryImage: 'automotive' },
  { province: 'Hà Nội', name: l('KCN khoa học sự sống Thăng Long (Mẫu)', 'Thang Long Life Sciences Industrial Park (Demo)'), focus: l('Khu sản xuất kiểm soát cao dành cho dược phẩm, thiết bị y tế và công nghệ sinh học.', 'Controlled manufacturing environment for pharmaceuticals, medical devices and biotechnology.'), parkType: l('Khu công nghiệp khoa học sự sống', 'Life-sciences industrial park'), industries: ['Pharmaceuticals', 'Medical devices', 'Biotechnology', 'Laboratory equipment'], restrictedIndustries: ['Heavy chemicals', 'Primary metal smelting'], image: 'pharma', galleryImage: 'electronics' },
  { province: 'Ninh Bình', name: l('KCN cơ khí Tràng An (Mẫu)', 'Trang An Engineering Industrial Park (Demo)'), focus: l('Trung tâm sản xuất linh kiện ô tô, máy công nghiệp và gia công cơ khí chính xác.', 'A production hub for automotive parts, industrial machinery and precision metalworking.'), parkType: l('Khu công nghiệp cơ khí – ô tô', 'Automotive and engineering park'), industries: ['Automotive', 'Industrial machinery', 'Metal fabrication', 'Precision engineering'], restrictedIndustries: ['Uncontrolled electroplating'], image: 'automotive', galleryImage: 'green' },
  { province: 'Thanh Hóa', name: l('KCN vật liệu công nghệ Lam Sơn (Mẫu)', 'Lam Son Advanced Materials Industrial Park (Demo)'), focus: l('Cụm sản xuất vật liệu kỹ thuật, thiết bị điện và cấu kiện công nghiệp.', 'Cluster for engineered materials, electrical equipment and industrial components.'), parkType: l('Khu công nghiệp đa ngành có kiểm soát', 'Controlled multi-sector industrial park'), industries: ['Advanced materials', 'Electrical equipment', 'Industrial components', 'Construction technology'], restrictedIndustries: ['High-emission cement production'], image: 'green', galleryImage: 'automotive' },
  { province: 'Nghệ An', name: l('KCN dệt may Sông Lam (Mẫu)', 'Song Lam Textile Industrial Park (Demo)'), focus: l('Chuỗi dệt may – phụ liệu – bao bì có hạ tầng xử lý nước thải tập trung.', 'Integrated textile, accessories and packaging chain with centralized wastewater treatment.'), parkType: l('Khu công nghiệp dệt may', 'Textile industrial park'), industries: ['Textiles', 'Garments', 'Footwear', 'Packaging'], restrictedIndustries: ['Tanning without pre-treatment'], image: 'textile', galleryImage: 'green' },
  { province: 'Đà Nẵng', name: l('KCN công nghệ số Đà Thành (Mẫu)', 'Da Thanh Digital Technology Park (Demo)'), focus: l('Không gian sản xuất công nghệ cao cho thiết bị thông minh, tự động hóa và trung tâm dữ liệu.', 'High-tech production environment for smart devices, automation and data centers.'), parkType: l('Khu công nghiệp công nghệ cao', 'High-tech industrial park'), industries: ['Smart electronics', 'Industrial automation', 'Data centers', 'Precision engineering'], restrictedIndustries: ['Heavy polluting industries'], image: 'electronics', galleryImage: 'pharma' },
  { province: 'Quảng Ngãi', name: l('KCN thực phẩm Dung Quất Xanh (Mẫu)', 'Dung Quat Green Food Industrial Park (Demo)'), focus: l('Cụm chế biến thực phẩm, đồ uống và bao bì với chuỗi lạnh tích hợp.', 'Food, beverage and packaging cluster with integrated cold-chain services.'), parkType: l('Khu công nghiệp chế biến thực phẩm', 'Food-processing industrial park'), industries: ['Food processing', 'Beverages', 'Packaging', 'Cold-chain logistics'], restrictedIndustries: ['Raw hide processing'], image: 'food', galleryImage: 'logistics' },
  { province: 'Bình Định', name: l('KCN nội thất Nhơn Hội (Mẫu)', 'Nhon Hoi Furniture Industrial Park (Demo)'), focus: l('Chuỗi sản xuất nội thất, sản phẩm gỗ kỹ thuật và thiết bị phục vụ nông nghiệp.', 'Manufacturing chain for furniture, engineered wood products and agricultural equipment.'), parkType: l('Khu công nghiệp sản xuất – logistics', 'Manufacturing and logistics park'), industries: ['Furniture', 'Engineered wood', 'Agricultural machinery', 'Logistics'], restrictedIndustries: ['Uncertified timber processing'], image: 'textile', galleryImage: 'logistics' },
  { province: 'Khánh Hòa', name: l('KCN kinh tế biển Nam Vân Phong (Mẫu)', 'South Van Phong Marine Economy Park (Demo)'), focus: l('Khu công nghiệp gắn cảng cho chế biến thủy sản, kho lạnh và dịch vụ hàng hải.', 'Port-linked park for seafood processing, cold storage and marine services.'), parkType: l('Khu công nghiệp – logistics cảng', 'Port and logistics industrial park'), industries: ['Seafood processing', 'Cold storage', 'Marine logistics', 'Packaging'], restrictedIndustries: ['Near-shore untreated discharge'], image: 'logistics', galleryImage: 'food' },
  { province: 'Bình Dương', name: l('KCN tự động hóa Sông Bé (Mẫu)', 'Song Be Automation Industrial Park (Demo)'), focus: l('Cụm nhà máy thông minh cho tự động hóa, robot công nghiệp và hàng tiêu dùng kỹ thuật.', 'Smart-factory cluster for automation, industrial robotics and engineered consumer goods.'), parkType: l('Khu công nghiệp thông minh', 'Smart industrial park'), industries: ['Industrial automation', 'Robotics', 'Consumer electronics', 'Precision engineering'], restrictedIndustries: ['Primary metal smelting'], image: 'automotive', galleryImage: 'electronics' },
  { province: 'Đồng Nai', name: l('KCN giao thông Long Thành (Mẫu)', 'Long Thanh Mobility Industrial Park (Demo)'), focus: l('Cụm công nghiệp phụ trợ cho ô tô, hàng không và sản phẩm cao su kỹ thuật.', 'Supporting cluster for automotive, aerospace and engineered rubber products.'), parkType: l('Khu công nghiệp công nghệ giao thông', 'Mobility technology industrial park'), industries: ['Automotive', 'Aerospace components', 'Engineered rubber', 'Supporting industries'], restrictedIndustries: ['Uncontrolled rubber recycling'], image: 'automotive', galleryImage: 'pharma' },
  { province: 'Long An', name: l('KCN logistics cửa ngõ Mekong (Mẫu)', 'Mekong Gateway Logistics Park (Demo)'), focus: l('Trung tâm phân phối vùng cho kho vận, chế biến thực phẩm và bao bì xuất khẩu.', 'Regional distribution hub for logistics, food processing and export packaging.'), parkType: l('Khu công nghiệp – logistics', 'Industrial and logistics park'), industries: ['Logistics', 'Warehousing', 'Food processing', 'Packaging'], restrictedIndustries: ['High-emission heavy industry'], image: 'logistics', galleryImage: 'food' },
  { province: 'Tây Ninh', name: l('KCN năng lượng Mộc Bài (Mẫu)', 'Moc Bai Energy Industrial Park (Demo)'), focus: l('Cụm sản xuất thiết bị điện mặt trời kết hợp chế biến nông sản và dệt may.', 'Cross-border cluster combining solar equipment, agro-processing and textiles.'), parkType: l('Khu công nghiệp cửa khẩu xanh', 'Green border industrial park'), industries: ['Solar equipment', 'Agricultural processing', 'Textiles', 'Electrical equipment'], restrictedIndustries: ['Uncontrolled dyeing'], image: 'green', galleryImage: 'textile' },
  { province: 'Bà Rịa–Vũng Tàu', name: l('KCN dịch vụ cảng Cái Mép (Mẫu)', 'Cai Mep Port Services Industrial Park (Demo)'), focus: l('Hệ sinh thái hậu cần cảng, thiết bị năng lượng ngoài khơi và cơ khí kết cấu.', 'Ecosystem for port logistics, offshore-energy equipment and structural fabrication.'), parkType: l('Khu công nghiệp dịch vụ cảng', 'Port services industrial park'), industries: ['Port logistics', 'Offshore energy equipment', 'Steel fabrication', 'Warehousing'], restrictedIndustries: ['Ship breaking'], image: 'logistics', galleryImage: 'automotive' },
  { province: 'Cần Thơ', name: l('KCN công nghệ thực phẩm Hậu Giang (Mẫu)', 'Hau Giang Food Technology Park (Demo)'), focus: l('Trung tâm công nghệ thực phẩm cho lúa gạo, sinh học ứng dụng và chuỗi lạnh.', 'Food-technology hub for rice products, applied biotechnology and cold chain.'), parkType: l('Khu công nghiệp công nghệ thực phẩm', 'Food-technology industrial park'), industries: ['Rice processing', 'Food biotechnology', 'Cold-chain logistics', 'Packaging'], restrictedIndustries: ['Untreated organic discharge'], image: 'food', galleryImage: 'pharma' },
  { province: 'Hậu Giang', name: l('KCN sinh học Mekong (Mẫu)', 'Mekong Bioeconomy Industrial Park (Demo)'), focus: l('Cụm kinh tế sinh học dành cho chế biến nông sản, vật liệu sinh học và năng lượng sinh khối.', 'Bioeconomy cluster for agro-processing, biomaterials and biomass energy.'), parkType: l('Khu công nghiệp sinh thái nông nghiệp', 'Agro eco-industrial park'), industries: ['Agricultural processing', 'Biomaterials', 'Biomass energy', 'Sustainable packaging'], restrictedIndustries: ['Persistent toxic chemicals'], image: 'green', galleryImage: 'food' },
  { province: 'An Giang', name: l('KCN thủy sản Tứ Giác Long Xuyên (Mẫu)', 'Long Xuyen Quadrangle Aquaculture Park (Demo)'), focus: l('Chuỗi giá trị thủy sản gồm chế biến, thức ăn chăn nuôi, kho lạnh và logistics xuất khẩu.', 'Aquaculture value chain spanning processing, feed, cold storage and export logistics.'), parkType: l('Khu công nghiệp thủy sản', 'Aquaculture industrial park'), industries: ['Aquaculture processing', 'Animal feed', 'Cold storage', 'Export logistics'], restrictedIndustries: ['Untreated aquaculture discharge'], image: 'food', galleryImage: 'logistics' },
];

const basePark = (index: number, definition: DemoParkDefinition): IndustrialParkProfile => {
  const id = `park-demo-${String(index).padStart(2, '0')}`;
  const { province } = definition;
  const unavailable = <T,>(unit?: string): SourcedValue<T> => ({ value: null, unit, verificationStatus: 'unverified', disclosureStatus: 'not_available' });
  return {
    ...vsipThaiBinh, id, slug: id, logoText: 'VIG', name: definition.name,
    summary: l(`${definition.focus.vi} Đây là dữ liệu mô phỏng, không đại diện cho một dự án thực tế.`, `${definition.focus.en} This is simulated data and does not represent a real project.`),
    parkType: definition.parkType,
    province, region: index < 8 ? 'North' : index < 13 ? 'Central' : 'South', coordinates: { lat: 10.8 + index * .32, lng: 105.4 + (index % 5) * .48 },
    address: l(`${province}, Việt Nam`, `${province}, Vietnam`), economicZone: l('Dữ liệu mẫu', 'Demo economic zone'), establishmentYear: 2026,
    operator: { ...vsipThaiBinh.operator, name: `Demo Industrial Developer ${index}`, overview: l('Nhà phát triển mẫu – không phải dữ liệu doanh nghiệp thực.', 'Demonstration developer – not factual company data.'), portfolioStats: [] },
    provinceProfile: { ...vsipThaiBinh.provinceProfile, province: l(province, province), population: unavailable('people'), grdp: unavailable('USD billion'), growthRate: unavailable('%'), context: l('Chưa cung cấp dữ liệu kinh tế địa phương.', 'Provincial economic data has not been provided.') },
    workforce: { ...vsipThaiBinh.workforce, laborForce: unavailable('people'), skilledLabor: unavailable('people'), catchmentPopulation: unavailable('people'), salaryBenchmark: [] },
    totalArea: s(180 + index * 12, 'ha', 'vig-demo-fixture'), industrialLandArea: s(120 + index * 8, 'ha', 'vig-demo-fixture'),
    phases: [{ name: l('Giai đoạn mẫu', 'Demo phase'), status: index % 3 === 0 ? 'developing' : 'operational', area: s(180 + index * 12, 'ha', 'vig-demo-fixture') }],
    availability: [{ type: index % 4 === 0 ? 'ready_built_factory' : 'industrial_land', total: s(120, 'ha', 'vig-demo-fixture'), available: s(25 + index, 'ha', 'vig-demo-fixture'), reserved: s(10, 'ha', 'vig-demo-fixture'), occupied: s(85 - index, 'ha', 'vig-demo-fixture'), transactionModes: ['lease'], minimumPlot: s(1, 'ha', 'vig-demo-fixture') }],
    connectivity: [{ type: 'road', name: l('Trục giao thông mẫu', 'Demo arterial road'), distanceKm: s(2 + index, 'km', 'vig-demo-fixture'), status: 'operational' }, { type: index % 2 ? 'port' : 'airport', name: l('Đầu mối logistics mẫu', 'Demo logistics gateway'), distanceKm: s(20 + index * 2, 'km', 'vig-demo-fixture'), status: 'operational' }],
    utilities: ['electricity', 'water', 'wastewater'].map((key, u) => ({ key, label: l(['Điện', 'Cấp nước', 'Nước thải'][u], ['Electricity', 'Water', 'Wastewater'][u]), capacity: index % 4 === 0 ? unavailable() : s([126, 12000, 8000][u], ['MVA', 'm³/day', 'm³/day'][u], 'vig-demo-fixture') })),
    suitableIndustries: definition.industries,
    restrictedIndustries: definition.restrictedIndustries,
    incentives: [], process: vsipThaiBinh.process.slice(0, 3), logistics: { shippingRoutes: [], indicativeCosts: [] }, community: [], sustainability: [l('Hạ tầng môi trường mẫu', 'Demo environmental infrastructure')], tenants: [],
    contact: {
      ...vsipThaiBinh.contact!,
      office: l(`Văn phòng điều hành ${definition.name.vi}`, `${definition.name.en} Administration Office`),
      address: l(`${province}, Việt Nam`, `${province}, Vietnam`),
      person: 'VIG Demo Desk',
      email: `demo${index}@vig.example`,
      website: 'vig.example',
    },
    media: [
      { id: `media-${id}-hero`, type: 'hero', title: l(`Hình ảnh mô phỏng: ${definition.parkType.vi}`, `Simulated view: ${definition.parkType.en}`), url: parkImages[definition.image], capturedAt: '2026-08-19', approved: true },
      { id: `media-${id}-gallery`, type: 'gallery', title: l('Hạ tầng ngành mục tiêu (mô phỏng)', 'Target-industry infrastructure (simulated)'), url: parkImages[definition.galleryImage], capturedAt: '2026-08-19', approved: true },
    ],
    documents: [{ id: `doc-${id}`, title: l('Tài liệu mẫu', 'Demo reference'), category: 'legal_approval', issuer: l('VIG Demo', 'VIG Demo'), language: 'multi', visibility: 'public', verificationStatus: 'verified' }],
    sourceLanguage: 'vi', dataOwner: 'VIG Demo Data', lastVerifiedAt: '2026-08-19', verifiedBy: 'Demo Admin', publicationStatus: index % 5 === 0 ? 'in_review' : 'published', conflicts: [],
  };
};

export const parks: IndustrialParkProfile[] = [vsipThaiBinh, ...demoParkDefinitions.map((definition, i) => basePark(i + 2, definition))];

export const assets: IndustrialAsset[] = parks.slice(0, 10).map((park, index) => ({
  id: `asset-${index + 1}`, parkId: park.id, name: l(index % 3 === 0 ? `Nhà xưởng xây sẵn ${index + 1}` : `Lô đất công nghiệp ${index + 1}`, index % 3 === 0 ? `Ready-built Factory ${index + 1}` : `Industrial Land Plot ${index + 1}`),
  type: index % 3 === 0 ? 'ready_built_factory' : index % 4 === 0 ? 'build_to_suit' : 'industrial_land', area: index % 3 === 0 ? 12000 + index * 500 : 2.5 + index, unit: index % 3 === 0 ? 'm²' : 'ha',
  transaction: 'lease', price: index === 0 ? s<number>(null, 'USD/m²', 'vsip-vi-2026', 'not_disclosed') : s(78 + index * 3, 'USD/m²/term', 'vig-demo-fixture'), availableFrom: `2027-${String((index % 9) + 1).padStart(2, '0')}-01`, powerMva: 4 + index,
  industries: park.suitableIndustries.slice(0, 3), featured: index < 4, image: park.media[0]?.url || hero,
  description: l('Tài sản công nghiệp mẫu với hạ tầng đồng bộ và kết nối logistics thuận lợi.', 'Demonstration industrial asset with integrated infrastructure and logistics access.'),
}));

export const expos: ExpoProgram[] = [
  { id: 'expo-cn', title: l('Triển lãm Công nghiệp Trung Quốc – Việt Nam', 'China–Vietnam Industrial Expo'), market: 'China–Vietnam', industries: ['Electronics', 'Supply chain'], date: '2026-10-15', status: 'upcoming', exhibitors: 86 },
  { id: 'expo-kr', title: l('Triển lãm Công nghiệp Hàn Quốc – Việt Nam', 'Korea–Vietnam Industrial Expo'), market: 'Korea–Vietnam', industries: ['Semiconductors', 'Automotive'], date: '2026-11-08', status: 'upcoming', exhibitors: 64 },
  { id: 'expo-global', title: l('Triển lãm Công nghiệp Toàn cầu – Việt Nam', 'Global–Vietnam Industrial Expo'), market: 'Global–Vietnam', industries: ['Industrial parks', 'Logistics'], date: '2026-09-20', status: 'live', exhibitors: 120 },
];
