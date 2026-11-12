import type { ExpoProgram, IndustrialAsset, IndustrialParkProfile, LocalizedText, SourcedValue } from './types';
import { translateToChinese } from './i18n';
import projects from './vsipProjects.json';
const l = (vi: string, en: string, zh = translateToChinese(en)): LocalizedText => ({ vi, en, zh });
const retrievedAt = '2026-11-12';
const unknownText = l('Chưa có dữ liệu', 'Not available', '暂无数据');

// Values are attributed to the public project page, not independently certified.
// Retrieval date is recorded separately; the source does not date its inventory.
export const parks: IndustrialParkProfile[] = projects.map(project => {
  const sourceId = `source-${project.slug}`;
  const s = <T,>(value: T | null, unit?: string): SourcedValue<T> => ({value, unit, sourceDocumentId: sourceId, verificationStatus: value === null ? 'unverified' : 'reviewed', disclosureStatus: value === null ? 'not_available' : 'public'});
  return {
    id: `park-${project.slug}`, slug: project.slug, name: l(project.nameVi, project.name, `${project.name} 工业园区`), logoText: project.name.startsWith('VSIP') ? 'VSIP' : 'QTIP',
    summary: l(`${project.nameVi} thuộc danh mục dự án công nghiệp do VSIP công bố, quy mô ${project.area.toLocaleString('vi-VN')} ha tại ${project.province}. Địa danh giữ theo nguồn; quỹ đất cần xác nhận lại với chủ đầu tư.`, `${project.name} is listed in VSIP's industrial project portfolio with a published area of ${project.area.toLocaleString('en-US')} ha in ${project.province}. Location names follow the source; confirm current availability with the developer.`, `${project.name} 是 VSIP 官方公布的工业项目，面积 ${project.area} 公顷。地名沿用来源资料；实际可用土地须向开发商确认。`),
    status: 'unknown', parkType: l('Dự án khu công nghiệp', 'Industrial park project', '工业园区项目'), establishmentYear: project.year, publicationStatus: 'published',
    totalArea: s(project.area, 'ha'), industrialLandArea: s(project.industrial, 'ha'), coordinates: null,
    address: l(`${project.province}, Việt Nam (địa danh theo nguồn VSIP)`, `${project.province}, Vietnam (location name used by VSIP)`), economicZone: unknownText, region: project.region as IndustrialParkProfile['region'], province: project.province,
    operator: { name: 'VSIP Group', overview: l('Danh mục dự án công nghiệp công bố trên website VSIP Group.', 'Industrial project portfolio published by VSIP Group.', 'VSIP 集团官方网站公布的工业项目。'), ownership: unknownText, establishedYear: 1996, website: 'https://www.vsip.com.vn/en/', portfolioStats: [], certifications: [] },
    provinceProfile: {province: l(project.province, project.province), population: s<number>(null, 'people'), grdp: s<number>(null, 'USD billion'), growthRate: s<number>(null, '%'), wageZone: '', context: unknownText},
    workforce: {laborForce: s<number>(null, 'people'), skilledLabor: s<number>(null, 'people'), catchmentRadiusKm: 0, catchmentPopulation: s<number>(null, 'people'), trainingInstitutions: [], salaryBenchmark: []},
    phases: [], availability: [{type: 'industrial_land', total: s(project.industrial, 'ha'), available: s(project.available, 'ha'), reserved: s<number>(null, 'ha'), occupied: s<number>(null, 'ha'), transactionModes: ['lease']}],
    connectivity: [], utilities: project.slug === 'vsip-thai-binh' ? [
      {key: 'electricity', label: l('Điện', 'Electricity', '电力'), capacity: s(126, 'MVA')},
      {key: 'water', label: l('Cấp nước', 'Water supply', '供水'), capacity: s(16500, 'm³/day')},
      {key: 'wastewater', label: l('Xử lý nước thải', 'Wastewater treatment', '污水处理'), capacity: s(9200, 'm³/day')},
    ] : [], amenities: [], suitableIndustries: project.slug === 'vsip-nghe-an-i' ? ['Electronics', 'Precision engineering', 'Garments', 'Consumer goods', 'Supporting industries'] : project.slug === 'vsip-iii-binh-duong' ? ['High-tech manufacturing', 'Semiconductors'] : [], restrictedIndustries: [], environmentalConditions: unknownText,
    incentives: [], process: [], logistics: {shippingRoutes: [], indicativeCosts: []}, sustainability: [], community: [], tenants: [],
    contact: {office: l('VSIP Group – Phòng Truyền thông', 'VSIP Group – Communications Department'), address: unknownText, person: '', title: l('Đầu mối liên hệ chung của tập đoàn', 'Group contact; not a dedicated project leasing desk'), phone: '+84 274 3743898', email: 'communications@vsip.com.vn', website: 'https://www.vsip.com.vn/en/', channels: ['Email', 'Phone']},
    media: project.images.map((url, i) => ({id: `${project.slug}-image-${i}`, type: i === 0 ? 'hero' : 'gallery', title: l('Hình ảnh dự án do VSIP công bố', 'Project imagery published by VSIP'), url, approved: true})),
    documents: [{id: sourceId, title: l('Nguồn: trang dự án chính thức VSIP', 'Source: official VSIP project page', '来源：VSIP 官方项目页面'), category: 'presentation', issuer: l('VSIP Group', 'VSIP Group'), language: 'en', visibility: 'public', verificationStatus: 'reviewed', sourceUrl: project.url}],
    sourceLanguage: 'en', sourceDocumentId: sourceId, dataOwner: 'VSIP Group (public website)', lastVerifiedAt: retrievedAt, conflicts: [],
  };
});
export const vsipThaiBinh = parks.find(p => p.slug === 'vsip-thai-binh')!;
// Project-level inventory, never invented individual plots, factory units or prices.
export const assets: IndustrialAsset[] = parks.filter(p => (p.availability[0].available.value ?? 0) > 0).map((park, index) => ({
  id: `asset-${index + 1}`, parkId: park.id, listingKind: 'project_inventory',
  name: l(`Quỹ đất công bố – ${park.name.vi}`, `Published land inventory – ${park.name.en}`, `已公布土地供应 – ${park.name.en}`),
  type: 'industrial_land', area: park.availability[0].available.value!, unit: 'ha', transaction: 'lease',
  price: {value: null, unit: 'USD/m²/term', disclosureStatus: 'not_available', verificationStatus: 'unverified'}, priceMode: 'not_available', availableFrom: '',
  industries: park.suitableIndustries.slice(0, 3), featured: index < 4, image: park.media[0]?.url || '', imageApproved: park.media.length > 0,
  description: l('Tổng quỹ đất được trang dự án VSIP công bố, không phải diện tích của một lô riêng lẻ. Nguồn không nêu ngày hiệu lực của quỹ đất. Liên hệ VSIP để xác nhận lô phù hợp, giá thuê và thời điểm bàn giao.', 'Total land inventory published on the VSIP project page, not an individual plot. The source does not specify an inventory effective date. Contact VSIP to confirm suitable plots, pricing and handover timing.', '此为 VSIP 公布的项目整体可用土地，并非单一地块。来源未注明库存生效日期。请联系 VSIP 确认地块、租金和交付时间。'),
}));

export const expos: ExpoProgram[] = [
  {
    id: 'expo-cn', title: l('Triển lãm Công nghiệp Trung Quốc – Việt Nam', 'China–Vietnam Industrial Expo'), market: 'China–Vietnam', industries: ['Electronics', 'Supply chain'], date: '2026-10-15', status: 'upcoming', exhibitors: 86,
    analytics: {
      visitors: 4280, products: 642, inboundRequests: 118, outboundRequests: 74, inboundDeals: 31, outboundDeals: 22, activeConnections: 96, completedConnections: 28, estimatedDealValueUsd: 6800000, updatedAt: '2026-08-20T09:30:00+07:00',
      trend: [{ date: '14/08', requests: 18, connections: 7 }, { date: '15/08', requests: 22, connections: 9 }, { date: '16/08', requests: 27, connections: 12 }, { date: '17/08', requests: 25, connections: 11 }, { date: '18/08', requests: 31, connections: 16 }, { date: '19/08', requests: 34, connections: 19 }, { date: '20/08', requests: 35, connections: 22 }],
      topIndustries: [{ industry: 'Electronics', requests: 68, connections: 34 }, { industry: 'Supply chain', requests: 51, connections: 25 }, { industry: 'Industrial machinery', requests: 39, connections: 21 }],
      topMarkets: [{ market: 'China', connections: 42 }, { market: 'Vietnam', connections: 34 }, { market: 'Singapore', connections: 12 }, { market: 'Malaysia', connections: 8 }],
    },
  },
  {
    id: 'expo-kr', title: l('Triển lãm Công nghiệp Hàn Quốc – Việt Nam', 'Korea–Vietnam Industrial Expo'), market: 'Korea–Vietnam', industries: ['Semiconductors', 'Automotive'], date: '2026-11-08', status: 'upcoming', exhibitors: 64,
    analytics: {
      visitors: 3160, products: 428, inboundRequests: 92, outboundRequests: 61, inboundDeals: 24, outboundDeals: 17, activeConnections: 78, completedConnections: 21, estimatedDealValueUsd: 5200000, updatedAt: '2026-08-20T09:25:00+07:00',
      trend: [{ date: '14/08', requests: 14, connections: 6 }, { date: '15/08', requests: 18, connections: 8 }, { date: '16/08', requests: 19, connections: 9 }, { date: '17/08', requests: 21, connections: 10 }, { date: '18/08', requests: 25, connections: 13 }, { date: '19/08', requests: 27, connections: 15 }, { date: '20/08', requests: 29, connections: 17 }],
      topIndustries: [{ industry: 'Semiconductors', requests: 57, connections: 30 }, { industry: 'Automotive', requests: 46, connections: 25 }, { industry: 'Electronic components', requests: 31, connections: 16 }],
      topMarkets: [{ market: 'Korea', connections: 35 }, { market: 'Vietnam', connections: 28 }, { market: 'Japan', connections: 9 }, { market: 'Thailand', connections: 6 }],
    },
  },
  {
    id: 'expo-global', title: l('Triển lãm Công nghiệp Toàn cầu – Việt Nam', 'Global–Vietnam Industrial Expo'), market: 'Global–Vietnam', industries: ['Industrial parks', 'Logistics'], date: '2026-09-20', status: 'live', exhibitors: 120,
    analytics: {
      visitors: 7890, products: 984, inboundRequests: 236, outboundRequests: 148, inboundDeals: 67, outboundDeals: 43, activeConnections: 184, completedConnections: 56, estimatedDealValueUsd: 14800000, updatedAt: '2026-08-20T09:32:00+07:00',
      trend: [{ date: '14/08', requests: 38, connections: 18 }, { date: '15/08', requests: 43, connections: 23 }, { date: '16/08', requests: 49, connections: 28 }, { date: '17/08', requests: 52, connections: 31 }, { date: '18/08', requests: 61, connections: 38 }, { date: '19/08', requests: 68, connections: 44 }, { date: '20/08', requests: 73, connections: 48 }],
      topIndustries: [{ industry: 'Industrial parks', requests: 126, connections: 61 }, { industry: 'Logistics', requests: 104, connections: 54 }, { industry: 'Electronics', requests: 79, connections: 41 }, { industry: 'Food processing', requests: 48, connections: 28 }],
      topMarkets: [{ market: 'Vietnam', connections: 62 }, { market: 'Korea', connections: 41 }, { market: 'China', connections: 35 }, { market: 'Japan', connections: 27 }, { market: 'Singapore', connections: 19 }],
    },
  },
];
