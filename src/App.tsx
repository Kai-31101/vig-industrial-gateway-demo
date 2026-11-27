import {DataTable} from './admin/components';
import {AdminFrame} from './admin/AdminFrame';
import {remoteEnabled} from './remote';
import {useRequestActions} from './AppContext';
import {AiChat,InternalAccess,AdminAssistant} from './AiChat';
import {LotusChatIcon} from './LotusChatIcon';
import type {IndustrialAsset} from './types';
import {ParkLocationMap,ParkMasterplan} from "./ParkMaps";
import {NearbyConnectivity,googleMapsPlaceUrl} from "./NearbyPlaces";
import {ParksMapView} from "./ParksMapView";
import {HomeParkMap} from "./HomeParkMap";
import {AreaInput,areaFactors,convertArea,type AreaUnit} from "./AreaInput";
import {BrandLogo} from "./BrandLogo";
import {industryLabel} from "./industryLabels";
import {HomeHeroVideo} from "./HomeHeroVideo";
import {useSearchDraft,isComposingKey,searchIncludes} from "./searchDraft";
import {portfolioMode,isPublicPark,isPublicAsset,leasingIntents,leasingIntentLabel,leasingTeam,validLeasingContext} from './leasing';
import {useMobile,MobileMenu,MobileActionBar,MobileDisclosure,PublicScrollRestore} from './MobileUX';
import {HomeAds} from './HomeAds';
import {PackageSettings} from './admin/PackageSettings';
import {PermissionMatrix} from './admin/PermissionMatrix';
import {TradeExpoSection} from './TradeExpoSection';
import {DiscoveryFilters,AssetSortSelect,sortAssets,sortKeyOf,matchesParkFilters,matchesAssetFilters,assetTypeLabel,assetTypeLabels,hasPublishedSale,homeSearchTarget,parkTypeOptionsOf} from './DiscoveryFilters';
import {assetPriceText,assetPriceParts} from './assetPrice';
import {leasingBadge,isLeased,leasedLast,lotCodeOf,cardSpecChips,industriesLine,formatDate,formatHandover,vatNote,num} from './assetDisplay';
import {sortParksByCompleteness} from './parkCompleteness';
import {ConnectionDetail,ConnectionDashboard,ExpoDirectoryAdmin} from './admin/Connections';
import {successfulConnection} from './connectionLogic';
import {validPhone} from './admin/model';
import {ageDays,areaRange,assetTypeKey,regionKey} from './admin/insights';
import {optionText} from './admin/copy';
import { CSSProperties, FormEvent, ReactNode, Fragment, useMemo, useState, useRef, useEffect, lazy, Suspense } from "react";
// Park management portal and its /admin Owner provisioning screens load on demand.
const PortalApp=lazy(()=>import("./portal/PortalApp"));
const AdminOwnersList=lazy(()=>import("./portal/AdminOwners").then(m=>({default:m.AdminOwnersList})));
const AdminOwnerDetail=lazy(()=>import("./portal/AdminOwners").then(m=>({default:m.AdminOwnerDetail})));
const portalFallback=<p role="status" style={{padding:24}}>Đang tải…</p>;
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Database,
  Download,
  Droplets,
  ExternalLink,
  Factory,
  FileCheck2,
  FileText,
  Filter,
  Handshake,
  HardHat,
  LayoutDashboard,
  Lock,
  LogIn,
  Map,
  MapPin,
  Menu,
  MessageCircle,
  PackageSearch,
  Phone,
  Plane,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Ship,
  Sparkles,
  TrainFront,
  Users,
  Recycle,
  Flame,
  RadioTower,
  Route as RouteIcon,
  Warehouse,
  X,
  Zap,
} from "lucide-react";
import { AppProvider, tr, useApp } from "./AppContext";
import { StatePanel, FactGroup, SafeImage, OptionalSection, DetailUnavailable, hasValue, safeUrl, absentValue, emptyCopy } from "./EmptyStates";
import { previewPark, previewAsset } from "./emptyPreview";
import { StatePreview } from "./StatePreview";
import { AdminProvider, useAdminActions as useAdmin } from './admin/AdminContext';
import { ContentList, ContentEditor } from './admin/ContentEditor';
import { UsersPage, AcceptInvitation } from './admin/Users';
import { BatchImport } from './admin/BatchImport';
import { ExpoReport } from './admin/ExpoReport';
import { Access } from './admin/ui';
import { firstAdminPage, routePermission } from './admin/model';
import { translateToChinese, ui } from "./i18n";
import {
  canPublish,
  displaySourced,
  getParkStandardChecklist,
  requestTransitions,
} from "./logic";
import type {
  ExpoDailyMetric,
  ExpoProgram,
  IndustrialParkProfile,
  IndustrialRequest,
  Language,
  LocalizedText,
  RequestKind,
  RequestStatus,
  SourcedValue,
} from "./types";

const tx = (vi: string, en: string, zh?: string): LocalizedText => ({ vi, en, zh });
const dataText = (value: string, language: Language) =>
  language === "zh" ? translateToChinese(value) : value;
const documentLanguageLabel = (value: string, language: Language) => {
  if (language !== "zh") return value.toUpperCase();
  return value === "vi" ? "越南语" : value === "en" ? "英语" : "多语言";
};
const standardGroupLabels: Record<string, LocalizedText> = {
  identity: tx("Thông tin nhận diện", "Identity"),
  operator: tx("Đơn vị phát triển/vận hành", "Developer and operator"),
  location: tx("Vị trí", "Location"),
  provincial_context: tx("Bối cảnh kinh tế địa phương", "Provincial context"),
  workforce: tx("Nguồn nhân lực", "Workforce"),
  land_availability: tx("Quỹ đất và sản phẩm sẵn có", "Land and availability"),
  masterplan: tx("Quy hoạch mặt bằng", "Masterplan"),
  connectivity: tx("Kết nối giao thông", "Connectivity"),
  infrastructure: tx("Hạ tầng kỹ thuật", "Infrastructure and utilities"),
  amenities: tx("Tiện ích và dịch vụ hỗ trợ", "Amenities and support"),
  target_industries: tx("Ngành nghề thu hút đầu tư", "Target industries"),
  incentives: tx("Ưu đãi đầu tư", "Investment incentives"),
  investment_process: tx("Quy trình đầu tư và thuê đất", "Investment process"),
  logistics: tx("Năng lực logistics", "Logistics"),
  sustainability_community: tx("Bền vững và cộng đồng", "Sustainability and community"),
  existing_tenants: tx("Doanh nghiệp đang hoạt động", "Existing tenants"),
  contact: tx("Thông tin liên hệ", "Contact"),
  media: tx("Hình ảnh và truyền thông", "Media"),
  legal_documents: tx("Hồ sơ pháp lý", "Legal evidence"),
  data_governance: tx("Nguồn và quản trị dữ liệu", "Data governance"),
};
const labels: Record<string, LocalizedText> = {
  unknown: tx("Chưa xác nhận trạng thái", "Status not confirmed"),
  operational: tx("Đang hoạt động", "Operational"),
  developing: tx("Đang phát triển", "Developing"),
  planned: tx("Quy hoạch", "Planned"),
  published: tx("Đã công bố", "Published"),
  in_review: tx("Đang duyệt", "In review"),
  draft: tx("Bản nháp", "Draft"),
  archived: tx("Lưu trữ", "Archived"),
  submitted: tx("Đã tiếp nhận", "Submitted"),
  under_review: tx("Đang xác minh", "Under review"),
  verified: tx("Đã xác minh", "Verified"),
  matching: tx("Đang chuẩn bị phương án", "Preparing options"),
  connection_scheduled: tx("Đang sắp xếp khảo sát", "Visit being arranged"),
  closed: tx("Đã đóng", "Closed"),
  rejected: tx("Từ chối", "Rejected"),
  reviewed: tx("Đã rà soát", "Reviewed"),
  unverified: tx("Chưa xác minh", "Unverified"),
  construction: tx("Đang thi công", "Under construction"),
  planning: tx("Đang quy hoạch", "Planning"),
  public: tx("Công khai", "Public"),
  admin_only: tx("Chỉ quản trị viên", "Admin only"),
  establishment_decision: tx("Quyết định thành lập", "Establishment decision"),
  enterprise_registration: tx(
    "Đăng ký doanh nghiệp",
    "Enterprise registration",
  ),
  legal_approval: tx("Văn bản pháp lý", "Legal approval"),
  presentation: tx("Tài liệu giới thiệu", "Presentation"),
  industrial_land: tx("Đất công nghiệp", "Industrial land"),
  ready_built_factory: tx("Nhà xưởng xây sẵn", "Ready-built factory"),
  warehouse: tx("Kho", "Warehouse"),
  build_to_suit: tx("Xây theo yêu cầu", "Build-to-suit"),
  upcoming: tx("Sắp diễn ra", "Upcoming"),
  live: tx("Đang diễn ra", "Live"),
};

function Badge({ value, tone = "blue" }: { value: string; tone?: string }) {
  const { language } = useApp();
  return (
    <span className={`badge ${tone}`}>
      {labels[value] ? tr(labels[value], language) : value.replaceAll("_", " ")}
    </span>
  );
}
function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="section-title">
      {eyebrow && <span>{eyebrow}</span>}
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  );
}
function Empty({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return <StatePanel title={title} text={text} action={action} />;
}
function StandardChecklist({ park }: { park: IndustrialParkProfile }) {
  const { language } = useApp();
  return (
    <div className="checklist standard-checklist">
      {getParkStandardChecklist(park).map((item) => (
        <div key={item.key} className={item.status}>
          {item.status === "available" ? (
            <Check />
          ) : item.status === "partial" ? (
            <Activity />
          ) : (
            <X />
          )}
          <span>{tr(standardGroupLabels[item.key], language)}</span>
          {item.requiredForPublication ? (
            <small>
              {ui(language, "Bắt buộc công bố", "Required to publish")}
            </small>
          ) : null}
          <b>
            {item.status === "available"
              ? ui(language, "Có dữ liệu", "Available")
              : item.status === "partial"
                ? ui(language, "Chưa đầy đủ", "Partial")
                : ui(language, "Chưa có", "Missing")}
          </b>
        </div>
      ))}
    </div>
  );
}
function SourceValue({
  value = absentValue,
  compact = false,
}: {
  value?: SourcedValue<unknown>;
  compact?: boolean;
}) {
  const { language } = useApp();
  return (
    <div className={compact ? "source-value compact" : "source-value"}>
      <strong>{displaySourced(value, language)}</strong>
      {!compact && (
        <small>
          {value.calculated
            ? ui(language, "Được tính toán", "Calculated")
            : value.asOf
              ? `${ui(language, "Cập nhật", "As of")} ${formatDate(value.asOf,language)||value.asOf}`
              : ""}{" "}
          ·{" "}
          {tr(
            labels[value.verificationStatus] ||
              tx(value.verificationStatus, value.verificationStatus),
            language,
          )}
        </small>
      )}
    </div>
  );
}

function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useApp();
  return (
    <label className={`language-select${compact ? " compact" : ""}`}>
      <span className="language-flag" aria-hidden="true">
        {language === "vi" ? (
          <svg viewBox="0 0 32 32"><rect width="32" height="32" fill="#da251d" /><path d="m16 7 2.1 6.3h6.7l-5.4 3.9 2 6.3-5.4-3.9-5.4 3.9 2-6.3-5.4-3.9h6.7z" fill="#ffeb3b" /></svg>
        ) : language === "zh" ? (
          <svg viewBox="0 0 32 32"><rect width="32" height="32" fill="#de2910" /><path d="m9 5 1.5 4.5h4.7l-3.8 2.8 1.5 4.5L9 14l-3.9 2.8 1.5-4.5-3.8-2.8h4.7z" fill="#ffde00" /><circle cx="20" cy="7" r="1.4" fill="#ffde00" /><circle cx="23" cy="11" r="1.4" fill="#ffde00" /><circle cx="23" cy="17" r="1.4" fill="#ffde00" /><circle cx="19" cy="20" r="1.4" fill="#ffde00" /></svg>
        ) : (
          <svg viewBox="0 0 32 32"><rect width="32" height="32" fill="#21468b" /><path d="M0 0 32 32M32 0 0 32" stroke="#fff" strokeWidth="7" /><path d="M0 0 32 32M32 0 0 32" stroke="#cf142b" strokeWidth="3" /><path d="M16 0v32M0 16h32" stroke="#fff" strokeWidth="10" /><path d="M16 0v32M0 16h32" stroke="#cf142b" strokeWidth="5" /></svg>
        )}
      </span>
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value as Language)}
        aria-label={ui(language, "Chọn ngôn ngữ", "Select language")}
      >
        <option value="vi">Tiếng Việt</option>
        <option value="en">English</option>
        <option value="zh">中文</option>
      </select>
      <ChevronDown aria-hidden="true" />
    </label>
  );
}

function Header() {
  const mobile=useMobile();const menuTrigger=useRef<HTMLButtonElement>(null);
  const closeMenu=()=>{setOpen(false);menuTrigger.current?.focus()};
  const { language } = useApp();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const nav = [
    [
      "/industrial-parks",
      ui(language, "Khu công nghiệp", "Industrial parks"),
    ],
    ["/assets", ui(language, "Mặt bằng", "Assets")],
    ["/find-supply", ui(language, "Tư vấn thuê", "Leasing consultation")],
  ];
  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/home" className="brand">
          <BrandLogo />
          <span>
            <b>Vietnam Singapore Industrial Park</b>
            <small>
              {ui(language, "Đất và nhà xưởng công nghiệp cho thuê", "Industrial land and factories for lease")}
            </small>
          </span>
        </Link>
        <button
          className="mobile-menu"
          ref={menuTrigger}
          aria-expanded={open}
          aria-label={
            open
              ? ui(language, "Đóng trình đơn", "Close menu")
              : ui(language, "Mở trình đơn", "Open menu")
          }
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
        <nav className={!mobile && open ? "nav open" : "nav"}>
          {nav.map(([path, label]) => (
            <Link
              key={path}
              className={location.pathname.startsWith(path) ? "active" : ""}
              to={path}
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
          <div className="nav-language">
            <LanguageToggle />
          </div>
        </nav>
        {mobile&&<MobileMenu open={open} close={closeMenu} label={ui(language,"Đóng trình đơn","Close menu")}>
          {nav.map(([path,label])=><Link key={path} to={path} onClick={closeMenu}>{label}</Link>)}<LanguageToggle/>
        </MobileMenu>}
        <div className="header-actions">
          <LanguageToggle />

        </div>
      </div>
    </header>
  );
}

function Footer() {
  const { language } = useApp();
  return (
    <footer>
      <div className="footer-grid">
        <div>
          <div className="brand footer-brand">
            <BrandLogo />
            <span>
              <b>Vietnam Singapore Industrial Park</b>
            </span>
          </div>
          <p>
            {ui(language, "Mặt bằng sản xuất cho thuê tại các khu công nghiệp VSIP.", "Manufacturing space for lease in VSIP industrial parks.")}
          </p>
        </div>
        <div>
          <b>{ui(language, "Khám phá", "Discover")}</b>
          <Link to="/industrial-parks">
            {ui(language, "Khu công nghiệp", "Industrial Parks")}
          </Link>
          <Link to="/assets">
            {ui(language, "Mặt bằng", "Industrial Assets")}
          </Link>
        </div>
        <div>
          <b>{emptyCopy(language,"Thuê mặt bằng","Leasing","租赁")}</b>
          <Link to="/find-supply">
            {ui(language, "Tư vấn thuê", "Leasing consultation")}
          </Link>
          <Link to="/find-supply?support=meeting">{leasingIntentLabel('Meeting / Connection',language)}</Link>
        </div>
        <div className="arobid-partner">
          <div className="arobid-powered-row">
            <span>
              {ui(language, "Được phát triển bởi", "Powered by")}
            </span>
            <span className="arobid-logo-wrap">
              <img
                src="https://hcminvhub1-2.vercel.app/figma-homepage/arobid-logo.svg"
                alt="arobid.com - A Road to Big Deals"
                width={159}
                height={40}
              />
            </span>
          </div>
        </div>
      </div>
      <div className="copyright">
        <span>© 2026 Vietnam Singapore Industrial Park · {ui(language, "Bản demo tương tác", "Interactive demo")}</span>
      </div>
    </footer>
  );
}
function FloatingParkChat() {
  const [failNext,setFailNext]=useState(false);
  const {
    language,
    parks,
    chatParkId,
    chatOpen,
    chatThreads,
    openParkChat,
    closeParkChat,
    toggleParkChat,
    sendParkChatMessage,retryParkChatMessage,
  } = useApp();
  const [draft, setDraft] = useState("");
  const activePark = parks.find((park) => park.id === chatParkId) || null;
  const threadIds = Object.keys(chatThreads);
  return (
    <div className="floating-chat-root">
      {chatOpen && !activePark && <section className="floating-chat-panel empty-conversations"><div className="floating-chat-screen"><header><b>{ui(language,"Trao đổi","Chats")}</b><button onClick={closeParkChat} aria-label={ui(language,"Đóng","Close")}><X/></button></header><StatePanel title={ui(language,"Chưa có hội thoại","No conversations yet")} text={ui(language,"Chọn khu công nghiệp để bắt đầu trao đổi.","Choose an industrial park to start a conversation.")} action={<Link className="button primary" to="/industrial-parks" onClick={closeParkChat}>{ui(language,"Khám phá KCN","Explore parks")}</Link>}/></div></section>}
      {chatOpen && activePark && (
        <section className="floating-chat-panel" aria-label={ui(language, "Trao đổi với khu công nghiệp", "Industrial park chat")}>
          <aside className="floating-chat-users">
            <div>
              <MessageCircle />
              <b>{ui(language, "Trao đổi", "Chats")}</b>
              <span>{threadIds.length}</span>
            </div>
            <nav>
              {threadIds.map((parkId) => {
                const park = parks.find((candidate) => candidate.id === parkId);
                if (!park) return null;
                return (
                  <button
                    type="button"
                    className={parkId === chatParkId ? "active" : ""}
                    onClick={() => openParkChat(parkId)}
                    key={parkId}
                  >
                    <BrandLogo compact />
                    <span>
                      <b>{tr(park.name, language)}</b>
                      <small>{ui(language, "Khu công nghiệp", "Industrial park")}</small>
                    </span>
                    <i />
                  </button>
                );
              })}
            </nav>
          </aside>
          <div className="floating-chat-screen">
            <header>
              <div>
                <BrandLogo compact />
                <div>
                  <b>{tr(activePark.name, language)}</b>
                  <small>{leasingTeam(language)}</small>
                </div>
              </div>
              <div>
                <em>{ui(language, "MÔ PHỎNG", "DEMO")}</em>
                <button type="button" onClick={closeParkChat} aria-label={ui(language, "Thu nhỏ cửa sổ chat", "Minimise chat")}>
                  <X />
                </button>
              </div>
            </header>
            <div className="floating-chat-messages" aria-live="polite">
              {(chatThreads[activePark.id] || []).map((message) => (
                <div className={`chat-bubble ${message.sender}`} key={message.id}>
                  {tr(message.text, language)}
                  <small className="chat-delivery">{message.at&&new Date(message.at).toLocaleTimeString(language==='vi'?'vi-VN':language==='zh'?'zh-CN':'en-US',{hour:'2-digit',minute:'2-digit'})} · {message.sender==='supplier'||message.contextOnly?ui(language,"Mô phỏng","Simulation"):message.status==='sending'?ui(language,"Đang gửi","Sending"):message.status==='failed'?ui(language,"Gửi thất bại","Failed"):ui(language,"Đã gửi (mô phỏng)","Sent (simulation)")}</small>
                  {message.status==='failed'&&<button className="button" onClick={()=>retryParkChatMessage(message.id)}>{ui(language,"Thử lại","Retry")}</button>}
                </div>
              ))}
            </div>
            {import.meta.env.DEV && <label className="chat-failure-demo"><input type="checkbox" checked={failNext} onChange={e=>setFailNext(e.target.checked)}/>{ui(language,"Mô phỏng lỗi gửi tin tiếp theo","Simulate next message failure")}</label>}
            <form
              className="floating-chat-composer"
              onSubmit={(event) => {
                event.preventDefault();
                if (!draft.trim()) return;
                sendParkChatMessage(draft,failNext);setFailNext(false);
                setDraft("");
              }}
            >
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={ui(language, "Nhập nội dung trao đổi...", "Type your message...")}
                aria-label={ui(language, "Nội dung trao đổi", "Chat message")}
              />
              <button type="submit" aria-label={ui(language, "Gửi tin nhắn", "Send message")}>
                <Send />
              </button>
            </form>
          </div>
        </section>
      )}
      <button
        type="button"
        className="floating-chat-launcher"
        onClick={toggleParkChat}
        aria-expanded={chatOpen}
        aria-label={chatOpen ? ui(language, "Đóng trao đổi với khu công nghiệp", "Close industrial park chat") : ui(language, "Mở trao đổi với khu công nghiệp", "Open industrial park chat")}
      >
        <LotusChatIcon/>
        {threadIds.length > 0 && <span>{threadIds.length}</span>}
      </button>
    </div>
  );
}
function PublicShell({ children }: { children: ReactNode }) {
  return (
    <>
      <PublicScrollRestore/>
      <Header />
      <main>{children}</main>
      <Footer />
      {remoteEnabled?<AiChat scope="public"/>:<FloatingParkChat />}
    </>
  );
}

function HomePage() {
  const mobile=useMobile();
  const [keyword,setKeyword]=useState("");
  const [region, setRegion] = useState("");
  const [industry, setIndustry] = useState("");
  const [status, setStatus] = useState("");
  const [kind, setKind] = useState("");
  const [deal, setDeal] = useState("");
  const { language, parks, assets } = useApp();
  const navigate = useNavigate();
  const publishedParks = sortParksByCompleteness(parks.filter(p=>isPublicPark(p)));
  const featured = publishedParks.slice(0, 12);
  const industries = [...new Set(publishedParks.flatMap(park => park.suitableIndustries))]
    .sort((a, b) => industryLabel(a, language).localeCompare(industryLabel(b, language), language));
  const all = emptyCopy(language, "Tất cả", "All", "全部");
  const parkTypes = parkTypeOptionsOf(parks, language);
  const assetTypes = Object.keys(assetTypeLabels).filter(v => assets.some(a => a.type === v && isPublicAsset(a, parks)));
  const sale = hasPublishedSale(assets, parks);
  function openParkResults() {
    navigate(homeSearchTarget({q: keyword, region, industry, status, kind, deal}));
  }
  return (
    <PublicShell>
      <section className="hero hero-with-video">
        <HomeHeroVideo title={emptyCopy(language, "Video giới thiệu VSIP", "VSIP introduction video", "VSIP 介绍视频")}/>
        <div className="hero-content">
          <div className="hero-intro">
            <h1
              className={
                language === "vi"
                  ? "hero-title-vi"
                  : language === "zh"
                    ? "hero-title-zh"
                    : undefined
              }
            >
              {language === "vi" ? <><span>Khu công nghiệp</span><span>Việt Nam – Singapore</span></> : emptyCopy(language,"","Vietnam Singapore Industrial Park","越南—新加坡工业园区")}
            </h1>
          </div>
          {mobile&&<div className="mobile-home-links"><Link to="/find-supply">{ui(language, "Tư vấn thuê", "Leasing consultation")}</Link><Link to="/assets">{ui(language,"Mặt bằng","Assets")}</Link></div>}
          <div className="hero-bottom">
            <div className="hero-actions">
              <Link className="button gold" to="/industrial-parks">
                {emptyCopy(language,"Xem khu công nghiệp","Explore parks","查看园区")}
                <ArrowRight size={18} />
              </Link>
              <Link className="button ghost" to="/find-supply">
                {ui(language,"Gửi nhu cầu thuê","Send leasing enquiry")}
              </Link>
            </div>
            <div className="hero-stats">
              <div>
                <b>{publishedParks.length}</b>
                <span>
                  {ui(language, "hồ sơ khu công nghiệp", "park profiles")}
                </span>
              </div>
              <div>
                <b>{assets.filter(a=>isPublicAsset(a,parks)).length}</b>
                <span>
                  {ui(language, "mặt bằng mẫu", "demo assets")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <form className="home-park-search" role="search" onSubmit={e => {
        e.preventDefault();
        openParkResults();
      }}>
        <div className="home-search-controls">
          <div className="home-search-keyword">
            <input
              aria-label={ui(language, "Tìm kiếm công nghiệp", "Industrial search")}
              value={keyword} onChange={e=>setKeyword(e.target.value)}
              onKeyDown={e => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                if (!isComposingKey(e)) openParkResults();
              }}
              placeholder={
                ui(language, "Tìm KCN, tỉnh, ngành hoặc loại mặt bằng...", "Search park, province, industry or asset type...")
              }
            />
            {(keyword || region || industry || status || kind || deal) && <button className="home-search-reset" type="button" onClick={() => {setKeyword("");setRegion("");setIndustry("");setStatus("");setKind("");setDeal("");}}>{emptyCopy(language, "Xóa bộ lọc", "Clear filters", "清除筛选")}</button>}
            <button className="home-search-submit" type="submit" aria-label={emptyCopy(language,"Tìm kiếm","Search","搜索")}><Search size={18} /></button>
          </div>
          <label>{emptyCopy(language, "Vùng miền", "Region", "地区")}
            <select value={region} onChange={e => setRegion(e.target.value)}>
              <option value="">{all}</option>
              <option value="North">{emptyCopy(language, "Miền Bắc", "North", "北部")}</option>
              <option value="Central">{emptyCopy(language, "Miền Trung", "Central", "中部")}</option>
              <option value="South">{emptyCopy(language, "Miền Nam", "South", "南部")}</option>
            </select>
          </label>
          <label>{emptyCopy(language, "Loại hình", "Type", "类型")}
            <select value={kind} onChange={e => setKind(e.target.value)}>
              <option value="">{all}</option>
              <optgroup label={emptyCopy(language, "Khu công nghiệp", "Industrial parks", "工业园区")}>
                {parkTypes.map(([value, label]) => <option key={value} value={"park:" + value}>{label}</option>)}
              </optgroup>
              {assetTypes.length > 0 && <optgroup label={emptyCopy(language, "Bất động sản công nghiệp", "Industrial property", "工业地产")}>
                {assetTypes.map(value => <option key={value} value={"asset:" + value}>{assetTypeLabel(value, language)}</option>)}
              </optgroup>}
            </select>
          </label>
          <label>{emptyCopy(language, "Hình thức", "Transaction", "交易形式")}
            <select value={deal} onChange={e => setDeal(e.target.value)}>
              <option value="">{all}</option>
              <option value="lease">{emptyCopy(language, "Cho thuê", "For lease", "租赁")}</option>
              {sale && <option value="sale">{emptyCopy(language, "Mua", "Purchase", "购买")}</option>}
            </select>
          </label>
          <label>{emptyCopy(language, "Ngành nghề", "Industry", "行业")}
            <select value={industry} onChange={e => setIndustry(e.target.value)}>
              <option value="">{all}</option>
              {industries.map(value => <option key={value} value={value}>{industryLabel(value, language)}</option>)}
            </select>
          </label>
          <label>{emptyCopy(language, "Trạng thái", "Status", "状态")}
            <select value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">{all}</option>
              <option value="operational">{emptyCopy(language, "Đang hoạt động", "Operational", "运营中")}</option>
              <option value="developing">{emptyCopy(language, "Đang phát triển", "Developing", "开发中")}</option>
              <option value="planned">{emptyCopy(language, "Quy hoạch", "Planned", "规划中")}</option>
            </select>
          </label>
        </div>
      </form>
      <HomeAds placement="top" />
      <HomeParkMap parks={publishedParks} assets={assets} language={language} />
      <section className="page section home-featured">
        <SectionTitle
          eyebrow={emptyCopy(language,"KHU CÔNG NGHIỆP VSIP","VSIP INDUSTRIAL PARKS","VSIP工业园区")}
          title={
            ui(language, "Hồ sơ khu công nghiệp nổi bật", "Featured industrial park profiles")
          }
          description={
            ui(language, "Dữ liệu được chuẩn hóa, có nguồn, đơn vị và thời điểm xác minh.", "Standardised data with sources, units and verification dates.")
          }
        />
        <div className="park-grid mobile-swipe" role="list" aria-label={ui(language,"KCN nổi bật","Featured parks")}>
          {featured.map((p) => (
            <ParkCard key={p.id} park={p} featured />
          ))}
        </div>
        <div className="center">
          <Link className="text-link" to="/industrial-parks">
            {language === "zh" ? `查看全部 ${publishedParks.length} 个园区档案` : ui(language, `Xem tất cả ${publishedParks.length} hồ sơ`, `View all ${publishedParks.length} profiles`)}
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>
      <HomeAds placement="bottom" />
      <section className="dark-section">
        <div className="page">
          <SectionTitle
            eyebrow={ui(language, "THUÊ TẠI VSIP", "LEASE WITH VSIP")}
            title={
              ui(language, "Mặt bằng phù hợp cho dự án sản xuất", "Space for your manufacturing project")
            }
          />
          <div className="funnel-grid">
            {[{type:'industrial_land',icon:Map,title:emptyCopy(language,'Đất công nghiệp cho thuê','Industrial land for lease','工业用地租赁'),description:emptyCopy(language,'Tìm quỹ đất phù hợp để phát triển cơ sở sản xuất.','Explore land for your manufacturing facility.','寻找适合建设生产基地的工业用地。')},{type:'ready_built_factory',icon:Factory,title:emptyCopy(language,'Nhà xưởng xây sẵn cho thuê','Ready-built factories for lease','标准厂房租赁'),description:emptyCopy(language,'Khám phá nhà xưởng phù hợp với nhu cầu sản xuất.','Explore factories for your manufacturing requirements.','寻找符合生产需求的厂房。')}].map(({type,icon:Icon,title,description},i)=><div key={type} className={`funnel-card ${i?'featured':''}`}><Icon/><span>{emptyCopy(language,'THUÊ TẠI VSIP','LEASE WITH VSIP','在VSIP租赁')}</span><h3>{title}</h3><p>{description}</p><Link to={`/assets?type=${type}`}>{emptyCopy(language,'Xem mặt bằng','Explore assets','查看物业')}<ArrowRight size={16}/></Link></div>)}
          </div>
        </div>
      </section>
      <section className="page section">
        <SectionTitle
          eyebrow={ui(language, "QUY TRÌNH VSIP", "HOW VSIP WORKS")}
          title={
            ui(language, "Từ nhu cầu thuê đến khảo sát mặt bằng", "From leasing enquiry to site visit")
          }
        />
        <div className="steps">
          {[
            [Search, ui(language, "Tra cứu", "Search")],
            [FileText, ui(language, "Gửi yêu cầu", "Request")],
            [Building2, ui(language, "Nhận phương án", "Receive options")],
            [Handshake, ui(language, "Tư vấn thuê", "Leasing consultation")],
            [Users, ui(language, "Yêu cầu khảo sát", "Site visit request")],
          ].map(([Icon, label], i) => {
            const C = Icon as typeof Search;
            return (
              <div key={String(label)}>
                <span>{i + 1}</span>
                <C />
                <b>{String(label)}</b>
              </div>
            );
          })}
        </div>
      </section>
      {/* User-approved exception to the 2026-11-17 rollback: Arobid ContactCtaCard pattern (compact white card). */}
      <section className="page section home-survey-cta" aria-labelledby="home-survey-cta-title">
        <div className="contact-cta-card">
          <div>
            <p className="contact-cta-card__eyebrow">{ui(language, "KHẢO SÁT KHU CÔNG NGHIỆP", "VISIT AN INDUSTRIAL PARK")}</p>
            <h2 id="home-survey-cta-title">
              {ui(language, "Tìm hiểu mặt bằng sản xuất tại VSIP", "Explore manufacturing space at VSIP")}
            </h2>
            <p className="contact-cta-card__description" id="home-survey-cta-description">{ui(language, "Trao đổi với Bộ phận Tiếp thị & Cho thuê để tư vấn và sắp xếp khảo sát.", "Contact the Marketing & Leasing Department for advice and a site visit request.")}</p>
          </div>
          <Link className="button primary contact-cta-card__action" to="/find-supply?support=meeting" aria-describedby="home-survey-cta-description">
            {ui(language, "Yêu cầu khảo sát", "Request a site visit")}
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}

function ParkStatusBadge({park}:{park:IndustrialParkProfile}) {
  const {language}=useApp();
  return <span title={park.statusEvidence ? tr(park.statusEvidence.note,language) : undefined}>
    <Badge value={park.status} tone={park.status==='operational'?'green':park.status==='developing'?'amber':'blue'} />
  </span>;
}

function ParkCard({ park,featured=false }: { park: IndustrialParkProfile;featured?:boolean }) {
  const { language, assets } = useApp();
  const assetCount = assets.filter(asset => asset.parkId === park.id && asset.transaction === "lease").length;
  const available = park.availability[0]?.available;
  return (
    <article className="park-card" role={featured?"listitem":undefined}>
      <Link to={`/industrial-parks/${park.slug}`} className="park-image" tabIndex={-1} aria-hidden="true">
        <SafeImage fallbackIllustration src={park.media.find(m => m.approved)?.url} alt={tr(park.name, language)} />

      </Link>
      <div className="park-body">
        <div className="park-meta">
          <ParkStatusBadge park={park} />
          <span>
            <MapPin size={14} />
            {park.province}
          </span>
        </div>
        <h3>
          <Link to={`/industrial-parks/${park.slug}`}>
            {tr(park.name, language)}
          </Link>
        </h3>
        <p>{tr(park.summary, language)}</p>
        <div className="park-facts">
          <div>
            <small>{ui(language, "Tổng diện tích", "Total area")}</small>
            <SourceValue value={park.totalArea} compact />
          </div>
          <div>
            <small>
              {ui(language, "Diện tích còn trống", "Available")}
            </small>
            {available?.value != null ? <SourceValue value={available} compact /> : <span>{ui(language, "Liên hệ xác nhận", "Contact for availability")}</span>}
          </div>
        </div>
        <div className="park-asset-count"><Building2 size={14} aria-hidden="true"/><span>{language === "zh" ? `${assetCount} 个资产` : ui(language, `${assetCount} mặt bằng`, `${assetCount} assets`)}</span></div>
        <div className="industries">
          {park.suitableIndustries.slice(0, 3).map((x) => (
            <span key={x}>{industryLabel(x, language)}</span>
          ))}
        </div>
      </div>
    </article>
  );
}

function ParksPage() {
  const { language, parks } = useApp();
  const [params,setParams]=useSearchParams();
  const q=params.get("q")||"",region=params.get("region")||"all",status=params.get("status")||"all",industry=params.get("industry")||"all";
  const setFilter=(key:string,value:string)=>setParams(previous=>{const next=new URLSearchParams(previous);if(value&&value!=="all")next.set(key,value);else next.delete(key);return next},{replace:true});
  const view=params.get("view")==="map"?"map":"list",setView=(value:string)=>setFilter("view",value==="map"?"map":"");
  const setQ=(value:string)=>setFilter("q",value),qInput=useSearchDraft(q,value=>setQ(value)),setRegion=(value:string)=>setFilter("region",value),setStatus=(value:string)=>setFilter("status",value),setIndustry=(value:string)=>setFilter("industry",value);
  const industryOptions = useMemo(
    () =>
      [...new Set(parks.flatMap((park) => park.suitableIndustries))].sort(
        (a, b) =>
          industryLabel(a, language).localeCompare(
            industryLabel(b, language),
            language === "vi" ? "vi" : language === "zh" ? "zh-CN" : "en",
          ),
      ),
    [parks, language],
  );
  const filtered = sortParksByCompleteness(parks.filter(
    (p) =>
      isPublicPark(p) && matchesParkFilters(p,params) && (!q.trim() ||
        searchIncludes(`${tr(p.name, language)} ${p.name.vi} ${p.name.en} ${p.province} ${p.suitableIndustries.map(i=>`${i} ${industryLabel(i,language)} ${industryLabel(i,"vi")}`).join(" ")}`, q)) &&
      (region === "all" || p.region === region) &&
      (industry === "all" || p.suitableIndustries.includes(industry)) &&
      (status === "all" || p.status === status),
  ));
  return (
    <PublicShell>
      <div className="page page-top park-directory">
        <div className="page-heading">
          <span>{emptyCopy(language,"KHU CÔNG NGHIỆP VSIP","VSIP INDUSTRIAL PARKS","VSIP工业园区")}</span>
          <h1>
            {ui(language, "Danh mục khu công nghiệp", "Industrial park directory")}
          </h1>
          <p>
            {ui(language, "Tra cứu vị trí, quỹ đất, hạ tầng kỹ thuật, khả năng kết nối và hồ sơ pháp lý của từng khu công nghiệp.", "Compare park locations, land and infrastructure.")}
          </p>
        </div>
        <DiscoveryFilters resultCount={filtered.length} primary={<div className="filter-panel desktop-park-filters">
          <label>
            <Search size={17} />
            <input
              {...qInput}
              placeholder={
                ui(language, "Tìm theo tên khu công nghiệp, tỉnh/thành hoặc ngành nghề...", "Search name, province, industry...")
              }
            />
          </label>
          <select value={region} onChange={(e) => setRegion(e.target.value)} aria-label={emptyCopy(language,"Vùng miền","Region","地区")}>
            <option value="all">
              {ui(language, "Tất cả vùng miền", "All regions")}
            </option>
            <option value="North">
              {ui(language, "Miền Bắc", "North")}
            </option>
            <option value="Central">
              {ui(language, "Miền Trung", "Central")}
            </option>
            <option value="South">
              {ui(language, "Miền Nam", "South")}
            </option>
          </select>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            aria-label={ui(language, "Lọc theo ngành", "Filter by industry")}
          >
            <option value="all">
              {ui(language, "Tất cả ngành nghề", "All industries")}
            </option>
            {industryOptions.map((item) => (
              <option value={item} key={item}>
                {industryLabel(item, language)}
              </option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label={emptyCopy(language,"Trạng thái","Status","状态")}>
            <option value="all">
              {ui(language, "Tất cả trạng thái", "All statuses")}
            </option>
            <option value="operational">
              {tr(labels.operational, language)}
            </option>
            <option value="developing">
              {tr(labels.developing, language)}
            </option>
            <option value="planned">{tr(labels.planned, language)}</option>
          </select>
        </div>}/>
        <div className="result-bar" id="directory-results" tabIndex={-1}>
          <b>
            {filtered.length}{" "}
            {ui(language, "khu công nghiệp", "industrial parks")}
          </b>
          <div className="view-toggle" role="group" aria-label={emptyCopy(language,"Chế độ xem","View mode","查看方式")}>
            <button type="button" aria-pressed={view==="list"} className={view==="list"?"active":""} onClick={() => setView("list")}>{emptyCopy(language,"Danh sách","List","列表")}</button>
            <button type="button" aria-pressed={view==="map"} className={view==="map"?"active":""} onClick={() => setView("map")}>{emptyCopy(language,"Bản đồ","Map","地图")}</button>
          </div>
          <span>
            <ShieldCheck size={16} />
            {ui(language, "Dữ liệu có nguồn đối chiếu", "Source-aware fields")}
          </span>
        </div>
        {filtered.length && view==="map" ? (
          <ParksMapView parks={filtered} language={language} />
        ) : filtered.length ? (
          <div className="park-grid">
            {filtered.map((p) => (
              <ParkCard key={p.id} park={p} />
            ))}
          </div>
        ) : (
          <Empty
            title={
              ui(language, "Không tìm thấy khu công nghiệp phù hợp", "No results")
            }
            text={
              ui(language, "Vui lòng điều chỉnh từ khóa hoặc bộ lọc.", "Try changing your filters.")
            }
            action={<><button className="button primary" onClick={() => {setParams({},{replace:true});}}>{ui(language,"Xóa bộ lọc","Clear filters")}</button><Link className="button outline" to="/find-supply">{ui(language,"Gửi yêu cầu","Send inquiry")}</Link></>}
          />
        )}
      </div>
    </PublicShell>
  );
}

function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button onClick={close}>
            <X />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function ContactModal({type,park}:{type:string;park:IndustrialParkProfile;close:()=>void}) {
  return <Navigate replace to={`/find-supply?parkId=${encodeURIComponent(park.id)}&support=${type==='Meeting'?'meeting':'inquiry'}`} />;
}
export function ParkDetailPage({draft,draftAssets}:{draft?:IndustrialParkProfile;draftAssets?:IndustrialAsset[]}={}) {
  const Shell=draft?Fragment:PublicShell;
  const mobile=useMobile();
  const { slug } = useParams();
  const { language, parks, assets:publicAssets, openParkChat } = useApp();
  const assets=draftAssets||publicAssets;
  const [modal, setModal] = useState("");
  const parkLocation=useLocation();
  const wantsAssets=parkLocation.hash==="#park-assets"||new URLSearchParams(parkLocation.search).get("tab")==="assets";
  const [activeParkTab, setActiveParkTab] = useState<"information" | "assets">(
    ()=>(wantsAssets||sessionStorage.getItem(`park-tab:${slug}:${language}`)==="assets"?"assets":"information"),
  );
  const tabKey=useRef(`park-tab:${slug}:${language}`);
  useEffect(()=>{if(draft)return;const key=`park-tab:${slug}:${language}`;if(tabKey.current!==key){tabKey.current=key;setActiveParkTab(sessionStorage.getItem(key)==="assets"?"assets":"information");}else sessionStorage.setItem(key,activeParkTab)},[slug,language,activeParkTab]);
  // /industrial-parks/<slug>#park-assets and ?tab=assets open the "Mặt bằng" tab and scroll to it.
  useEffect(()=>{
    if(draft||!wantsAssets)return;
    setActiveParkTab("assets");
    const frame=requestAnimationFrame(()=>requestAnimationFrame(()=>document.getElementById("park-assets")?.scrollIntoView({behavior:"auto",block:"start"})));
    return()=>cancelAnimationFrame(frame);
  },[slug,wantsAssets,parkLocation.key]);
  const [activeSection, setActiveSection] = useState("overview");
  const [previewParams] = useSearchParams();
  const previewMode = import.meta.env.DEV ? previewParams.get("demoState") : null;
  const originalPark = draft || parks.find((p) => p.slug === slug && isPublicPark(p));
  const park = originalPark ? previewPark(originalPark, previewMode) : undefined;
  if (!park)
    return (
      <Shell>
        <div className="page page-top">
          <DetailUnavailable to="/industrial-parks" label={ui(language,"Danh mục khu công nghiệp","Industrial park directory")} />
        </div>
      </Shell>
    );
  const linked = previewMode ? [] : assets.filter((a) => a.parkId === park.id && (draft||isPublicAsset(a,parks)));
  const approvedMedia = park.media.filter(m => m.approved && m.url.trim());
  const visibleSections: Record<string, boolean> = {
    overview: true, connectivity: Boolean(park.coordinates || park.connectivity.length),
    infrastructure: Boolean(park.utilities.length || park.amenities.length),
    workforce: [park.provinceProfile.population, park.provinceProfile.grdp, park.provinceProfile.growthRate, park.workforce.laborForce, park.workforce.skilledLabor, park.workforce.catchmentPopulation, park.provinceProfile.context, park.workforce.salaryBenchmark].some(hasValue),
    incentives: park.incentives.length > 0, media: approvedMedia.length > 0, documents: park.documents.some(d=>d.visibility==='public'),
  };
  const publicDocs = park.documents.filter(d=>d.visibility==='public');
  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const target=document.getElementById(id);
    target?.querySelectorAll('details').forEach(detail=>detail.open=true);
    target?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };
  const switchParkTab = (tab: "information" | "assets") => {
    const nav = document.querySelector<HTMLElement>(".park-primary-tabs");
    const content = document.querySelector<HTMLElement>(".detail-page");
    const top = content && nav ? content.getBoundingClientRect().top + window.scrollY - nav.offsetHeight - (mobile ? 64 : 76) : 0;
    const scrolled = nav && nav.getBoundingClientRect().top <= (mobile ? 65 : 77);
    setActiveParkTab(tab);
    if (scrolled) requestAnimationFrame(() => window.scrollTo({top,behavior:"instant"}));
  };
  const showPhotos=()=>{setActiveParkTab("information");requestAnimationFrame(()=>requestAnimationFrame(()=>{scrollToSection("media");const gallery=document.getElementById("media");gallery?.setAttribute("tabindex","-1");gallery?.focus({preventScroll:true})}))};
  const landRecords=park.availability.filter(item=>item.type==="industrial_land");
  const mobileMetrics=[{label:ui(language,"Tổng diện tích","Total area"),value:park.totalArea},{label:ui(language,"Đất còn trống","Available land"),value:landRecords.length===1?landRecords[0].available:undefined},{label:ui(language,"Điện","Electricity"),value:park.utilities.find(u=>u.key==="electricity")?.capacity},{label:ui(language,"Cấp nước","Water"),value:park.utilities.find(u=>u.key==="water")?.capacity}];
  const sectionNavItems = [
    ["overview", ui(language, "Tổng quan", "Overview")],
    ["connectivity", ui(language, "Kết nối", "Connectivity")],
    ["infrastructure", ui(language, "Hạ tầng", "Infrastructure")],
    ["workforce", ui(language, "Nhân lực", "Workforce")],
    ["incentives", ui(language, "Ưu đãi", "Incentives")],
    ["media", ui(language, "Hình ảnh", "Media")],
    ["documents", ui(language, "Tài liệu", "Documents")],
  ].filter(([id]) => visibleSections[id]);
  return (
    <Shell>
      {mobile&&<section className="mobile-park-summary page">
        <div className="breadcrumbs"><Link to="/industrial-parks">{ui(language,"Khu công nghiệp","Industrial parks")}</Link><ChevronRight size={14}/><span>{park.province}</span></div>
        <div className="mobile-park-identity">{approvedMedia.length>0?<button onClick={showPhotos} aria-label={emptyCopy(language,`Xem ${approvedMedia.length} ảnh`,`View photos (${approvedMedia.length})`,`查看图片 (${approvedMedia.length})`)}><SafeImage src={approvedMedia[0].url} alt=""/></button>:<div className="mobile-photo-placeholder"/>}<div><ParkStatusBadge park={park}/><h1>{tr(park.name,language)}</h1><p>{tr(park.address,language)}</p></div></div>
        <div className="mobile-profile-metrics">{mobileMetrics.map(item=><div key={item.label}><small>{item.label}</small><strong>{item.value?displaySourced(item.value,language):ui(language,"Liên hệ xác nhận","Contact to confirm")}</strong></div>)}</div>
      </section>}
      <div className="detail-hero">
        <SafeImage fallbackIllustration src={approvedMedia[0]?.url} alt={tr(park.name, language)} />
        <div className="detail-shade" />
        <div className="page detail-hero-content">
          <div className="breadcrumbs">
            <Link to="/industrial-parks">
              {ui(language, "Khu công nghiệp", "Industrial parks")}
            </Link>
            <ChevronRight size={14} />
            <span>{tr(park.name, language)}</span>
          </div>
          <div className="detail-badges">
            <ParkStatusBadge park={park} />
            {!previewMode && park.verifiedBy && <span className="verified">
              <ShieldCheck size={15} />
              {ui(language, "Hồ sơ đã xác minh", "Verified profile")}
            </span>}
          </div>
          <h1>{tr(park.name, language)}</h1>
          <p>
            <MapPin size={18} />
            {tr(park.address, language)}
          </p>
          <div className="detail-actions">
            <button className="button gold" onClick={() => setModal("Inquiry")}>
              <Send size={17} />
              {ui(language, "Gửi yêu cầu", "Send inquiry")}
            </button>
            <button className="button ghost" onClick={() => openParkChat(park.id)}>
              <MessageCircle size={17} />
              {ui(language, "Trao đổi", "Chat")}
            </button>
            <button
              className="button ghost"
              onClick={() =>
                setModal(
                  "Meeting",
                )
              }
            >
              <Users size={17} />
              {leasingIntentLabel('Meeting / Connection',language)}
            </button>
          </div>
        </div>
      </div>
      <nav className="park-primary-tabs" aria-label={ui(language, "Nội dung hồ sơ", "Profile content")}>
        <div className="page">
          <button
            type="button"
            className={activeParkTab === "information" ? "active" : ""}
            onClick={() => switchParkTab("information")}
          >
            <FileText /> {ui(language, "Thông tin", "Information")}
          </button>
          <button
            type="button"
            className={activeParkTab === "assets" ? "active" : ""}
            onClick={() => switchParkTab("assets")}
          >
            <PackageSearch /> {ui(language, "Mặt bằng", "Assets")}
            <span>{linked.length}</span>
          </button>
        </div>
      </nav>
      <div className={`page detail-page ${activeParkTab}`}>
        <aside className="park-section-nav">
          <b>{ui(language, "Nội dung hồ sơ", "Profile sections")}</b>
          {sectionNavItems.map(([id, label]) => (
            <button
              type="button"
              className={activeSection === id ? "active" : ""}
              onClick={() => scrollToSection(id)}
              key={id}
            >
              {label}
            </button>
          ))}
        </aside>
        <section className="key-facts adaptive-key-facts"><MobileDisclosure title={ui(language,"Thông tin quỹ đất và nguồn dữ liệu","Land details and sources")}>
          <FactGroup facts={[
            {label:ui(language,"Tổng diện tích","Total area"),source:park.totalArea},
            {label:ui(language,"Đất công nghiệp","Industrial land"),source:park.industrialLandArea},
            {label:ui(language,"Diện tích sẵn sàng","Available area"),source:park.availability[0]?.available},
            {label:ui(language,"Lô tối thiểu","Minimum plot"),source:park.availability[0]?.minimumPlot},
          ]} />
        </MobileDisclosure></section>
        <section id="overview" className={`detail-grid ${!hasValue(park.operator.overview) && !safeUrl(park.operator.website) ? 'overview-sparse' : ''}`}>
          <div className="content-card wide">
            <SectionTitle
              eyebrow={ui(language, "HỒ SƠ", "PROFILE")}
              title={
                ui(language, "Tổng quan khu công nghiệp", "Industrial park overview")
              }
            />
            <p className="lead">{tr(park.summary, language) || emptyCopy(language,"Thông tin giới thiệu đang được bổ sung. Bạn có thể gửi yêu cầu để VSIP hỗ trợ.","The overview is not yet available. Send a request for VSIP support.","项目介绍暂未提供，可向VSIP提交需求。")}</p>
            <FactGroup facts={[
              {label:ui(language,"Loại hình","Park type"),value:tr(park.parkType,language)},
              {label:ui(language,"Khu kinh tế","Economic zone"),value:tr(park.economicZone,language)},
              {label:ui(language,"Năm thành lập","Established"),value:park.establishmentYear == null ? null : String(park.establishmentYear)},
              {label:ui(language,"Giai đoạn","Phase"),value:park.phases[0] ? tr(park.phases[0].name,language) : null},
            ]} />
          </div>
          {portfolioMode !== "demo" && <aside className="content-card operator-card"><MobileDisclosure title={ui(language,"Đơn vị phát triển","Developer")}>
            <BrandLogo compact />
            <h3>{dataText(park.operator.name, language)}</h3>
            <p>{tr(park.operator.overview, language)}</p>
            {safeUrl(park.operator.website) && <a href={park.operator.website} target="_blank" rel="noreferrer">
              {ui(language, "Website đơn vị phát triển", "Developer website")}
              <ExternalLink size={14} />
            </a>}
          </MobileDisclosure></aside>}
        </section>
        <OptionalSection show={portfolioMode !== "demo" && park.operator.portfolioStats.some(x => hasValue(x.value))} className="profile-stats">
          <SectionTitle
            eyebrow={ui(language, "NĂNG LỰC ĐƠN VỊ PHÁT TRIỂN", "OPERATOR TRACK RECORD")}
            title={
              ui(language, "Năng lực đơn vị phát triển", "Developer track record")
            }
          />
          <div className="profile-stat-grid">
            {park.operator.portfolioStats.map((x) => (
              <article key={x.label.en}>
                <SourceValue value={x.value} compact />
                <span>{tr(x.label, language)}</span>
              </article>
            ))}
          </div>
          {park.conflicts?.length ? (
            <div className="warning">
              <Activity />
              <div>
                <b>
                  {ui(language, "Có dữ liệu cần đối soát", "Source conflict requires review")}
                </b>
                <p>
                  {park.conflicts[0].field}: {park.conflicts[0].primary} ↔{" "}
                  {park.conflicts[0].secondary}
                </p>
              </div>
            </div>
          ) : null}
        </OptionalSection>
        <OptionalSection show={visibleSections.connectivity} id="connectivity">
          <SectionTitle
            eyebrow={ui(language, "VỊ TRÍ", "LOCATION")}
            title={
              ui(language, "Vị trí và kết nối chiến lược", "Location and strategic connectivity")
            }
          />
          {!!park.places?.length && park.coordinates && Number.isFinite(park.coordinates.lat) && Number.isFinite(park.coordinates.lng) && <NearbyConnectivity park={park} language={language}/>}
          {!!park.places?.length && park.connectivity.length > 0 && <h3 className="asset-subhead">{emptyCopy(language,"Tuyến kết nối chính","Key transport links","主要交通连接")}</h3>}
          <div className="connect-grid">
            {!park.places?.length && park.coordinates && Number.isFinite(park.coordinates.lat) && Number.isFinite(park.coordinates.lng) && <ParkLocationMap park={park} language={language}/>}<div className="connect-list">
              {park.connectivity.map((c, i) => (
                <article key={i}>
                  {c.type === "port" ? (
                    <Ship />
                  ) : c.type === "airport" ? (
                    <Plane />
                  ) : c.type === "rail" ? (
                    <TrainFront />
                  ) : (
                    <MapPin />
                  )}
                  <div>
                    <b>{tr(c.name, language)}</b>
                    <span>
                      {c.distanceKm
                        ? displaySourced(c.distanceKm, language)
                        : ""}{" "}
                      {c.travelTime ? `· ${tr(c.travelTime, language)}` : ""}
                    </span>
                    {c.completionYear && (
                      <small>
                        {ui(language, "Dự kiến hoàn thành", "Expected completion")}{" "}
                        {c.completionYear}
                      </small>
                    )}
                  </div>
                  <Badge
                    value={c.status}
                    tone={c.status === "operational" ? "green" : "amber"}
                  />
                </article>
              ))}
            </div>
          </div>
        </OptionalSection>
        <OptionalSection show={Boolean(park.masterplan?.plots.length||linked.length)}>
          <SectionTitle eyebrow={ui(language,"QUY HOẠCH","MASTERPLAN")} title={ui(language,"Quy hoạch mặt bằng và hiện trạng quỹ đất","Masterplan and land availability")}/>
          <ParkMasterplan key={park.id} assets={linked} language={language} plan={park.masterplan} parkId={park.id}/>
        </OptionalSection>
        <OptionalSection show={visibleSections.infrastructure} id="infrastructure">
          <SectionTitle
            eyebrow={ui(language, "HẠ TẦNG", "INFRASTRUCTURE")}
            title={
              ui(language, "Hạ tầng và tiện ích đồng bộ", "Integrated infrastructure and utilities")
            }
          />
          <FactGroup facts={park.utilities.map(u => ({label:tr(u.label,language),source:u.capacity}))} />
          <div className="pill-list">
            {park.amenities.map((x) => (
              <span key={x.en}>
                <Check />
                {tr(x, language)}
              </span>
            ))}
          </div>
        </OptionalSection>
        <OptionalSection show={visibleSections.workforce} id="workforce" className="detail-grid">
<MobileDisclosure title={ui(language,"Nhân lực và kinh tế địa phương","Workforce and local economy")}>
          <div className="content-card wide">
            <SectionTitle
              eyebrow={ui(language, "BỐI CẢNH ĐỊA PHƯƠNG", "PROVINCIAL CONTEXT")}
              title={
                ui(language, "Kinh tế địa phương và nguồn nhân lực", "Provincial economy and workforce")
              }
            />
            <FactGroup facts={[
              {label:ui(language,"Dân số","Population"),source:park.provinceProfile.population},
              {label:"GRDP",source:park.provinceProfile.grdp},
              {label:ui(language,"Tốc độ tăng trưởng","Growth"),source:park.provinceProfile.growthRate},
              {label:ui(language,"Lực lượng lao động","Labour force"),source:park.workforce.laborForce},
              {label:ui(language,"Lao động qua đào tạo","Skilled labour"),source:park.workforce.skilledLabor},
              {label:ui(language,"Nguồn lao động","Labour catchment"),source:park.workforce.catchmentPopulation},
            ]}/>
            <p>{tr(park.provinceProfile.context, language)}</p>
          </div>
          {park.workforce.salaryBenchmark.length > 0 && <aside className="content-card">
            <h3>
              {ui(language, "Mức lương tham khảo", "Salary benchmark")}
            </h3>
            {park.workforce.salaryBenchmark.length ? (
              park.workforce.salaryBenchmark.map((x) => (
                <div className="salary" key={x.role.en}>
                  <span>{tr(x.role, language)}</span>
                  <b>{dataText(x.rangeUsd, language)}</b>
                </div>
              ))
            ) : (
              <p>{ui(language, "Chưa có dữ liệu", "Not available")}</p>
            )}
          </aside>}
        </MobileDisclosure>
</OptionalSection>
        <OptionalSection show={visibleSections.incentives} id="incentives">
          <SectionTitle
            eyebrow={ui(language, "ƯU ĐÃI", "INCENTIVES")}
            title={
              ui(language, "Ưu đãi đầu tư", "Investment incentives")
            }
          />
          {park.incentives.length ? (
            park.incentives.map((x) => (
              <div className="tax-card" key={x.name.en}>
                <div>
                  <h3>{tr(x.name, language)}</h3>
                  <p>{tr(x.eligibility, language)}</p>
                  <small>
                    {ui(language, "Hiệu lực", "Effective")}:{" "}
                    {x.effectiveDate} · {ui(language, "Nguồn", "Source")}: {x.sourceDocumentId}
                  </small>
                </div>
                <div className="tax-timeline">
                  {x.schedule.map((s, i) => (
                    <article key={i}>
                      <b>{s.rate}</b>
                      <span>{tr(s.label, language)}</span>
                      <small>{dataText(s.years, language)}</small>
                    </article>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <Empty
              title={
                ui(language, "Chưa có thông tin ưu đãi", "No incentive information")
              }
              text={
                ui(language, "Dữ liệu chưa được cung cấp.", "This information has not been provided.")
              }
            />
          )}
        </OptionalSection>
        <section id="park-assets" className="park-assets-panel">
          <SectionTitle
            eyebrow={ui(language, "SẢN PHẨM SẴN CÓ", "AVAILABILITY")}
            title={
              ui(language, "Quỹ đất và nhà xưởng đang chào thuê", "Available land and industrial assets")
            }
          />
          {linked.length ? (
            <><div className="asset-result-bar"><b>{linked.length} {ui(language, "mặt bằng", "assets")}</b><AssetSortSelect list={linked}/></div>
            <div className="asset-grid profile-assets">
              {sortAssets(linked,sortKeyOf(previewParams)).map((a) => (
                <AssetCard key={a.id} asset={a} context="park" />
              ))}
            </div></>
          ) : (
            <Empty
              title={
                ui(language, "Chưa có sản phẩm được công bố", "No published assets")
              }
              text={
                ui(language, "Liên hệ Bộ phận Tiếp thị & Cho thuê để tư vấn mặt bằng tại khu này.", "Contact the Marketing & Leasing Department for space in this park.")
              }
              action={<Link className="button primary" to={`/find-supply?parkId=${park.id}`}>{ui(language, "Tư vấn thuê", "Leasing consultation")}</Link>}
            />
          )}
        </section>
        <OptionalSection show={park.process.length > 0}>
<MobileDisclosure title={ui(language,"Quy trình đầu tư","Investment process")}>
          <SectionTitle
            eyebrow={ui(language, "QUY TRÌNH ĐẦU TƯ", "INVESTMENT PROCESS")}
            title={
              ui(language, "Quy trình thuê đất và thực hiện thủ tục đầu tư", "Land lease and investment procedure")
            }
          />
          <div className="process-list">
            {park.process.map((p) => (
              <article key={p.order}>
                <span>{p.order}</span>
                <div>
                  <h3>{tr(p.title, language)}</h3>
                  <p>
                    {tr(p.authority, language)} · {tr(p.duration, language)}
                  </p>
                  <small>
                    {ui(language, "Kết quả hồ sơ", "Output")}:{" "}
                    {tr(p.output, language)}
                  </small>
                </div>
              </article>
            ))}
          </div>
        </MobileDisclosure>
</OptionalSection>
        <OptionalSection show={[park.logistics.portCapacityDwt,park.logistics.cargoThroughput,park.logistics.shippingRoutes,park.logistics.indicativeCosts].some(hasValue)} className="detail-grid">
          <div className="content-card wide">
            <SectionTitle
              eyebrow={ui(language, "LOGISTICS", "LOGISTICS")}
              title={
                ui(language, "Năng lực kết nối logistics", "Logistics capability")
              }
            />
            <div className="metric-grid">
              {park.logistics.portCapacityDwt && (
                <div>
                  <small>
                    {ui(language, "Cỡ tàu tiếp nhận tối đa", "Maximum vessel")}
                  </small>
                  <SourceValue value={park.logistics.portCapacityDwt} />
                </div>
              )}
              {park.logistics.cargoThroughput && (
                <div>
                  <small>
                    {ui(language, "Sản lượng hàng hóa qua cảng", "Port throughput")}
                  </small>
                  <SourceValue value={park.logistics.cargoThroughput} />
                </div>
              )}
            </div>
            <div className="route-list">
              {park.logistics.shippingRoutes.map((r) => (
                <div key={r.destination}>
                  <Ship />
                  <b>{r.destination}</b>
                  <span>{r.time ? dataText(r.time, language) : "—"}</span>
                  <small>{r.frequency ? dataText(r.frequency, language) : "—"}</small>
                </div>
              ))}
            </div>
          </div>
          {park.logistics.indicativeCosts.length > 0 && <aside className="content-card">
            <h3>
              {ui(language, "Chi phí vận chuyển tham khảo", "Indicative costs")}
            </h3>
            {park.logistics.indicativeCosts.map((c) => (
              <div className="salary" key={c.container}>
                <span>{ui(language, "Container", "Container")} {c.container}</span>
                <SourceValue value={c.usd} compact />
              </div>
            ))}
            <small>
              {ui(language, "Chi phí mang tính tham khảo tại thời điểm của tài liệu nguồn.", "Indicative only, based on the source profile.")}
            </small>
          </aside>}
        </OptionalSection>
        {mobile&&(park.restrictedIndustries.length>0||hasValue(park.environmentalConditions))&&<section className="content-card mobile-restrictions"><h3>{ui(language,"Điều kiện đầu tư","Investment conditions")}</h3>{park.restrictedIndustries.length>0&&<p><b>{ui(language,"Ngành hạn chế","Restricted industries")}: </b>{park.restrictedIndustries.map(x=>industryLabel(x,language)).join(', ')}</p>}<p>{tr(park.environmentalConditions,language)}</p></section>}
        <OptionalSection show={Boolean(park.industryNote) || [park.suitableIndustries,park.sustainability,park.community].some(hasValue)} className="triple">
          {(park.suitableIndustries.length > 0 || park.industryNote) && <div className="content-card">
            <h3>
              {ui(language, "Ngành nghề thu hút", "Industry focus")}
            </h3>
            {park.industryNote && <p className="profile-source-note">{tr(park.industryNote,language)}</p>}
            <div className="pill-list">
              {park.suitableIndustries.map((x) => (
                <span key={x}>
                  <Check /> {industryLabel(x, language)}
                </span>
              ))}
            </div>
          </div>}
          {park.sustainability.length > 0 && <div className="content-card">
            <h3>
              {ui(language, "Phát triển bền vững", "Sustainability")}
            </h3>
            {park.sustainability.map((x) => (
              <p className="checkline" key={x.en}>
                <Check />
                {tr(x, language)}
              </p>
            ))}
          </div>}
          {park.community.length > 0 && <div className="content-card">
            <h3>{ui(language, "Cộng đồng", "Community")}</h3>
            {park.community.length ? (
              park.community.map((x) => (
                <p className="checkline" key={x.en}>
                  <Check />
                  {tr(x, language)}
                </p>
              ))
            ) : (
              <p>{ui(language, "Chưa có dữ liệu", "Not available")}</p>
            )}
          </div>}
        </OptionalSection>
        {approvedMedia.length ? (
          <section id="media">
            <SectionTitle
              eyebrow={ui(language, "10 · TRUYỀN THÔNG", "10 · MEDIA")}
              title={
                ui(language, "Hình ảnh và mặt bằng khu công nghiệp", "Industrial park media and masterplan")
              }
            />
            <div className="media-gallery">
              {approvedMedia
                .map((item) => (
                  <figure key={item.id}>
                    <SafeImage fallbackIllustration src={item.url} alt={tr(item.title, language)} />
                    <figcaption>
                      <b>{tr(item.title, language)}</b>
                      <span>
                        {item.capturedAt
                          ? `${ui(language, "Ngày cập nhật", "Updated")}: ${item.capturedAt}`
                          : ui(language, "Hình ảnh minh họa", "Illustrative media")}
                      </span>
                    </figcaption>
                  </figure>
                ))}
            </div>

          </section>
        ) : null}
        <OptionalSection show={visibleSections.documents} id="documents">
          <SectionTitle
            eyebrow={ui(language, "11 · TÀI LIỆU", "11 · DOCUMENTS")}
            title={
              ui(language, "Hồ sơ pháp lý và tài liệu dự án", "Legal evidence and verification")
            }
          />
          <MobileDisclosure title={ui(language,"Hồ sơ pháp lý và tài liệu","Documents and sources")}><div className="doc-list">
            {publicDocs.map((d) => (
              <article key={d.id}>
                <span
                  className={`doc-icon ${d.visibility === "admin_only" ? "locked" : ""}`}
                >
                  {d.visibility === "admin_only" ? <Lock /> : <FileCheck2 />}
                </span>
                <div>
                  <h3>{tr(d.title, language)}</h3>
                  <p>
                    {tr(d.issuer, language)}{" "}
                    {d.issueDate ? `· ${formatDate(d.issueDate,language)||d.issueDate}` : ""} ·{" "}
                    {documentLanguageLabel(d.language, language)}
                  </p>
                  <small>
                    {tr(
                      labels[d.verificationStatus] ||
                        tx(d.verificationStatus, d.verificationStatus),
                      language,
                    )}{" "}
                    ·{" "}
                    {d.visibility === "admin_only"
                      ? ui(language, "chỉ quản trị viên", "admin only")
                      : ui(language, "công khai", "public")}
                  </small>
                </div>
                {d.visibility !== "public" ? (
                  <button disabled>
                    <Lock size={15} />
                    {ui(language, "Chỉ quản trị viên", "Admin only")}
                  </button>
                ) : safeUrl(d.sourceUrl) ? (
                  <a href={d.sourceUrl} target="_blank" rel="noreferrer">
                    <Download size={15} />
                    {ui(language, "Xem tài liệu", "View source")}
                  </a>
                ) : <span className="document-unavailable">{emptyCopy(language,"Chưa có bản tải xuống","Download not available","暂无下载文件")}</span>}
              </article>
            ))}
          </div></MobileDisclosure>
        </OptionalSection>
        <section className="contact-card">
          <div>
            <span>{emptyCopy(language,"LIÊN HỆ THUÊ MẶT BẰNG","LEASING CONTACT","租赁联系")}</span>
            <h2>
              {emptyCopy(language,"Quan tâm thuê mặt bằng tại khu này?","Interested in leasing space at this park?","有意租赁本园区物业？")}
            </h2>
            {park.contact ? <div className="published-contact">
              <h3>{tr(park.contact.office,language)}</h3>
              <p>{language === "en" ? `VSIP ${leasingTeam(language)}` : `${leasingTeam(language)} VSIP`}</p>
              <p><a href={`tel:${park.contact.phone.replace(/[^+0-9]/g,'')}`}>{park.contact.phone}</a> · <a href={`mailto:${park.contact.email}`}>{park.contact.email}</a></p>
              <p>{tr(park.contact.address,language)}</p>
            </div> : <p>{ui(language,"Chưa có đầu mối liên hệ công khai.","No public contact is available.")}</p>}
          </div>
          <div>
            <button
              className="button primary"
              onClick={() => setModal("Inquiry")}
            >
              <Send size={17} />
              {ui(language, "Gửi yêu cầu tư vấn", "Send inquiry")}
            </button>
            <Link className="button outline" to="/assets">
              <PackageSearch size={17} />
              {ui(language, "Xem mặt bằng cho thuê", "Explore leasing properties")}
            </Link>
          </div>
        </section>
      </div>
      {!draft && modal && (
        <ContactModal type={modal} park={park} close={() => setModal("")} />
      )}
    {!draft&&<MobileActionBar><button className="button primary" onClick={()=>setModal("Inquiry")}><Send size={16}/>{ui(language,"Gửi yêu cầu","Inquiry")}</button><button data-chat onClick={()=>openParkChat(park.id)}><MessageCircle size={16}/>{ui(language,"Trao đổi","Chat")}</button><button onClick={()=>setModal("Meeting")}><Users size={16}/>{emptyCopy(language,"Khảo sát","Site visit","考察")}</button></MobileActionBar>}
    </Shell>
  );
}

/** Drops a leading copy of the field label from a free-text value ("Mặt tiền 50 m" under the label "Mặt tiền" shows "50 m"). */
function withoutLeadingLabel(value: string, labels: string[]) {
  const v = value.trim();
  for (const label of labels) if (label && v.toLowerCase().startsWith(label.toLowerCase())) { const rest = v.slice(label.length).replace(/^[\s:：-]+/, ""); if (rest) return rest; }
  return v;
}
const utilityIcon = (key: string) => key === "electricity" || key === "power" ? <Zap /> : key === "water" ? <Droplets /> : key === "wastewater" ? <Recycle /> : key === "roads" || key === "road" ? <RouteIcon /> : key === "telecom" ? <RadioTower /> : key === "fire" ? <Flame /> : <Activity />;
function AssetStatusBadge({asset}:{asset:IndustrialAsset}){
  const {language}=useApp();const badge=leasingBadge(asset,language);
  return badge?<span className={`badge ${badge.tone}`.trim()} data-asset-status={badge.key}>{badge.label}</span>:null;
}
function AssetCard({
  asset,
  context = "list",
}: {
  asset: IndustrialAsset;
  context?: "list" | "park";
}) {
  const { language, parks } = useApp();
  const t = (vi: string, en: string, zh: string) => emptyCopy(language, vi, en, zh);
  const park = parks.find((p) => p.id === asset.parkId);
  const requestUrl = `/find-supply?${new URLSearchParams({
    parkId: asset.parkId,
    assetId: asset.id,
  }).toString()}`;
  const similarUrl = `/find-supply?${new URLSearchParams({ parkId: asset.parkId }).toString()}`;
  const name = tr(asset.name, language);
  const lot = lotCodeOf(asset, park);
  const leased = isLeased(asset);
  const price = assetPriceParts(asset, language);
  const vat = price.specific ? vatNote(asset, language) : "";
  const chips = cardSpecChips(asset, language);
  const zone = asset.zone && hasValue(asset.zone) ? tr(asset.zone, language) : "";
  const parkName = park ? tr(park.name, language) : t("Chưa có KCN liên kết", "Linked park unavailable", "关联园区暂不可用");
  const subline = (context === "list" ? [parkName, zone] : [zone, industriesLine(asset, language)]).filter(Boolean).join(" · ");
  const areaText = hasValue(asset.area) ? `${num(asset.area, language)} ${asset.unit}` : "";
  return (
      <article className="asset-card" data-leasing-status={asset.leasingStatus||undefined}>
        <div className="asset-card-image">
          <SafeImage fallbackIllustration src={asset.image} alt={name} />
          {lot && <span className="asset-lot-code"><span className="asset-vh">{t("Mã lô", "Lot", "地块编号")} </span>{lot}</span>}
        </div>
        <div className="asset-card-body">
          <div className="asset-card-badges">
            <Badge value={asset.type} tone="blue" />
            <AssetStatusBadge asset={asset} />
          </div>
          <h3><Link to={`/assets/${asset.id}`}>{name}</Link>{areaText && <span className="asset-card-area"> · {areaText}</span>}</h3>
          {subline && <p>
            <MapPin size={14} />
            {subline}
          </p>}
          <div className="asset-card-facts">
            <strong className={`asset-price${price.specific ? "" : " is-muted"}`}><span className="asset-price-amount">{price.amount}</span>{price.basis && <span className="asset-price-basis">{price.basis}</span>}</strong>
            {vat && <small className="asset-price-note">{vat}</small>}
          </div>
          {chips.length > 0 && <ul className="asset-card-specs" aria-label={t("Thông số chính", "Key specifications", "主要参数")}>
            {chips.map((chip) => <li key={chip}>{chip}</li>)}
          </ul>}
          <div className="asset-card-actions">
            <Link className="primary" to={`/assets/${asset.id}`}>
              <ArrowRight /> {t("Xem chi tiết", "View details", "查看详情")}<span className="asset-vh"> — {name}</span>
            </Link>
            {leased
              ? <Link className="secondary" to={similarUrl}><Search /> {t("Tìm mặt bằng tương tự", "Find similar", "查找类似物业")}</Link>
              : <Link className="secondary" to={park ? requestUrl : "/find-supply"}>
                <Send /> {t("Hỏi thuê", "Enquire", "咨询租赁")}<span className="asset-vh"> — {name}</span>
              </Link>}
          </div>
        </div>
      </article>
  );
}
function AssetsPage() {
  const { language, assets, parks } = useApp();
  const [params,setParams]=useSearchParams();const type=params.get("type")||"all";const setType=(value:string)=>setParams(old=>{const next=new URLSearchParams(old);if(value==="all")next.delete("type");else next.set("type",value);return next},{replace:true});
  const [retiredTransaction,setRetiredTransaction]=useState(false);
  const requestedTransaction=params.get('transaction');
  useEffect(()=>{if(requestedTransaction && requestedTransaction!=='lease' && !(requestedTransaction==='sale' && hasPublishedSale(assets,parks))){setRetiredTransaction(true);setParams(old=>{const next=new URLSearchParams(old);next.delete('transaction');return next},{replace:true})}},[requestedTransaction,setParams,assets,parks]);
  const filtered = assets.filter((a) => isPublicAsset(a,parks) && parks.some(p=>p.id===a.parkId&&isPublicPark(p)&&matchesAssetFilters(a,p,params))&&(type === "all" || a.type === type));
  const assetTypeFilters = [
    { value: "all", icon: PackageSearch, vi: "Tất cả loại hình", en: "All assets" },
    { value: "industrial_land", icon: Map, vi: "Đất công nghiệp", en: "Industrial land" },
    { value: "ready_built_factory", icon: Factory, vi: "Nhà xưởng xây sẵn", en: "Ready-built factory" },
    { value: "warehouse", icon: Warehouse, vi: "Kho vận", en: "Warehouse" },
    { value: "build_to_suit", icon: HardHat, vi: "Xây theo yêu cầu", en: "Build-to-suit" },
  ];
  return (
    <PublicShell>
      <div className="page page-top asset-directory">
        <div className="page-heading">
          <span>{ui(language, "BẤT ĐỘNG SẢN CÔNG NGHIỆP", "INDUSTRIAL ASSETS")}</span>
          <h1>
            {ui(language, "Mặt bằng công nghiệp cho thuê", "Industrial assets for lease")}
          </h1>
          <p>
            {ui(language, "Quỹ đất công nghiệp, nhà xưởng xây sẵn, kho vận và giải pháp xây theo yêu cầu.", "Land, factories, warehouses and build-to-suit solutions.")}
          </p>
        </div>
        {retiredTransaction&&<p role="status">{emptyCopy(language,"Bộ lọc giao dịch cũ không còn áp dụng. Danh mục hiện chỉ có mặt bằng cho thuê.","The previous transaction filter is no longer supported. This catalogue contains leasing properties only.","原交易筛选已停用，当前目录仅展示租赁物业。")}</p>}<DiscoveryFilters asset resultCount={filtered.length}/><div
          className="filter-tabs"
          role="group"
          aria-label={ui(language, "Lọc loại hình bất động sản", "Filter asset type")}
        >
          {assetTypeFilters.map((option) => {
            const FilterIcon = option.icon;
            return (
              <button
                type="button"
                className={type === option.value ? "active" : ""}
                aria-pressed={type === option.value}
                onClick={() => setType(option.value)}
                key={option.value}
              >
                <FilterIcon size={16} />
                {language === "vi"
                  ? option.vi
                  : language === "zh"
                    ? translateToChinese(option.en)
                    : option.en}
              </button>
            );
          })}
        </div>
        <div className="asset-result-bar" id="directory-results" tabIndex={-1}>
          <b>
            {filtered.length} {emptyCopy(language, "mặt bằng", filtered.length === 1 ? "asset" : "assets", "个物业")}
          </b>
          <AssetSortSelect list={filtered}/>

        </div>
        {filtered.length ? (
          <div className="asset-grid">
            {sortAssets(filtered,sortKeyOf(params)).map((a) => (
              <AssetCard key={a.id} asset={a} context="list" />
            ))}
          </div>
        ) : (
          <Empty
            title={ui(language, "Chưa có mặt bằng phù hợp", "No matching assets")}
            text={emptyCopy(language, "Hãy nới bớt điều kiện lọc hoặc gửi yêu cầu để VSIP tìm mặt bằng phù hợp.", "Try loosening the filters or send an enquiry and VSIP will look for a match.", "请放宽筛选条件，或提交需求由VSIP为您寻找合适物业。")}
            action={<><button className="button primary" onClick={() => setParams({},{replace:true})}>{ui(language,"Xóa bộ lọc","Clear filters")}</button><Link className="button outline" to="/find-supply">{ui(language,"Gửi yêu cầu","Send inquiry")}</Link></>}
          />
        )}
      </div>
    </PublicShell>
  );
}
export function AssetDetailPage({draft,draftPark}:{draft?:IndustrialAsset;draftPark?:IndustrialParkProfile}={}) {
  const Shell=draft?Fragment:PublicShell;
  const { id } = useParams();
  const { assets, parks, language, openParkChat } = useApp();
  const [params] = useSearchParams();
  const [shot, setShot] = useState(0);
  const t = (vi: string, en: string, zh: string) => emptyCopy(language, vi, en, zh);
  const mode = import.meta.env.DEV ? params.get("demoState") : null;
  const original = draft || assets.find(a => a.id === id && isPublicAsset(a,parks) && parks.some(p=>p.id===a.parkId&&isPublicPark(p)));
  const asset = original ? previewAsset(original,mode) : undefined;
  if (!asset) return <Shell><div className="page page-top"><DetailUnavailable to="/assets" label={ui(language,"Mặt bằng","Assets")} /></div></Shell>;
  const park = draftPark || (mode === "orphan" ? undefined : parks.find(p => p.id === asset.parkId));
  const requestUrl = park ? `/find-supply?${new URLSearchParams({parkId:park.id,assetId:asset.id})}` : "/find-supply";
  const parkAssetsUrl = park?.slug ? `/industrial-parks/${park.slug}?tab=assets` : "/industrial-parks";
  const name = tr(asset.name,language);
  const specs = asset.specs || {}, terms = asset.terms || {};
  const lot = lotCodeOf(asset, park);
  const leased = isLeased(asset);
  const price = assetPriceParts(asset, language);
  const vat = price.specific ? vatNote(asset, language) : "";
  const zone = asset.zone && hasValue(asset.zone) ? tr(asset.zone, language) : "";
  const areaText = hasValue(asset.area) ? `${num(asset.area, language)} ${asset.unit}` : "";
  const shots = [
    ...(asset.image ? [{ url: asset.image, caption: undefined as LocalizedText | undefined }] : []),
    ...(asset.gallery || []).filter(g => g && g.url && (draft || g.approved) && g.url !== asset.image).map(g => ({ url: g.url, caption: g.caption })),
  ].slice(0, 12);
  const current = shots[Math.min(shot, Math.max(0, shots.length - 1))];
  const n = (v: unknown, unit = "") => typeof v === "number" && Number.isFinite(v) ? `${num(v, language)}${unit}` : "";
  const sized = asset.type === "ready_built_factory" || asset.type === "warehouse";
  const specFacts: { label: string; value?: unknown }[] = sized ? [
    { label: t("Chiều cao thông thủy", "Clear height", "净高"), value: n(specs.clearHeightM, " m") },
    { label: t("Tải trọng sàn", "Floor load", "地面承重"), value: n(specs.floorLoadTonM2, ` ${t("tấn/m²", "t/m²", "吨/m²")}`) },
    { label: t("Diện tích văn phòng", "Office area", "办公面积"), value: n(specs.officeAreaM2, " m²") },
    { label: t("Cửa/bến container", "Dock doors", "集装箱门/月台"), value: n(specs.dockDoors) },
    { label: t("Số tầng", "Floors", "楼层数"), value: n(specs.floors) },
    { label: t("Năm hoàn thành", "Year built", "建成年份"), value: typeof specs.builtYear === "number" ? String(specs.builtYear) : "" },
    { label: t("Hệ thống PCCC", "Fire protection", "消防系统"), value: specs.fireSystem && hasValue(specs.fireSystem) ? tr(specs.fireSystem, language) : "" },
  ] : [
    { label: t("Kích thước", "Dimensions", "尺寸"), value: specs.dimensions },
    { label: t("Mặt tiền", "Frontage", "临街面宽"), value: specs.frontage && hasValue(specs.frontage) ? withoutLeadingLabel(tr(specs.frontage, language), [t("Mặt tiền", "Frontage", "临街面宽"), "Mặt tiền", "Frontage"]) : "" },
    { label: t("Mật độ xây dựng tối đa", "Maximum building coverage", "最大建筑密度"), value: n(specs.coverageMaxPct, "%") },
  ];
  const visibleSpecs = specFacts.filter(f => hasValue(f.value));
  const termRows = ([
    [t("Bàn giao", "Available from", "交付时间"), formatHandover(asset.availableFrom, language)],
    [t("Thuê tối thiểu", "Minimum lease", "最短租期"), typeof terms.minLeaseYears === "number" ? `${num(terms.minLeaseYears, language)} ${t("năm", "years", "年")}` : ""],
    [t("Đặt cọc", "Deposit", "押金"), typeof terms.depositMonths === "number" ? `${num(terms.depositMonths, language)} ${t("tháng", "months", "个月")}` : ""],
    [t("Thanh toán", "Payment", "付款方式"), terms.paymentNote && hasValue(terms.paymentNote) ? tr(terms.paymentNote, language) : ""],
    [t("Phí quản lý/hạ tầng", "Management/infrastructure fees", "管理/基础设施费"), terms.feeNote && hasValue(terms.feeNote) ? tr(terms.feeNote, language) : ""],
    [t("Hạn thuê đất", "Land lease until", "土地租期至"), formatDate(specs.leaseTermUntil, language)],
  ] as [string, string][]).filter(([, v]) => v);
  const ownUtilities = [
    { key: "power", icon: <Zap />, label: t("Công suất điện", "Power", "电力容量"), value: n(asset.powerMva, " MVA") },
    { key: "water", icon: <Droplets />, label: t("Cấp nước", "Water supply", "供水"), value: n(asset.waterM3Day, ` ${t("m³/ngày", "m³/day", "m³/天")}`) },
  ].filter(u => u.value);
  const parkUtilities = (park?.utilities || []).filter(u => hasValue(u.capacity));
  const industries = (asset.industries || []).filter(Boolean);
  const parkAssets = park ? assets.filter(a => a.parkId === park.id && (draft || isPublicAsset(a, parks))) : [];
  const others = leasedLast(parkAssets.filter(a => a.id !== asset.id)).slice(0, 3);
  const hasLot = !!park?.masterplan?.plots.some(p => p.assetId === asset.id);
  const hasCoords = !!park?.coordinates && Number.isFinite(park.coordinates.lat) && Number.isFinite(park.coordinates.lng);
  const lotPoint = asset.coordinates && Number.isFinite(asset.coordinates.lat) && Number.isFinite(asset.coordinates.lng) ? asset.coordinates : null;
  const publicDocs = (park?.documents || []).filter(d => d.visibility === "public");
  const hasSpecData = visibleSpecs.length > 0 || termRows.length > 0 || ownUtilities.length > 0;
  const verification = asset.specsVerification === "verified" ? t("Đã xác minh", "Verified", "已核验") : asset.specsVerification === "reviewed" ? t("Đã rà soát", "Reviewed", "已审阅") : t("Chưa xác minh", "Unverified", "未核验");
  const asOf = formatDate(asset.specsAsOf, language);
  return <Shell><div className="page page-top asset-detail-page asset-detail-v2">
    <div className="breadcrumbs"><Link to="/assets">{ui(language,"Mặt bằng","Assets")}</Link>{park && <><ChevronRight size={14}/><Link to={parkAssetsUrl}>{tr(park.name,language)}</Link></>}<ChevronRight size={14}/><span>{name}</span></div>
    <header className="asset-detail-head">
      <div className="asset-detail-badges"><Badge value={asset.type}/><AssetStatusBadge asset={asset}/>{lot && <span className="badge asset-lot-badge">{t("Lô", "Lot", "地块")} {lot}</span>}</div>
      <h1>{name}{areaText ? ` · ${areaText}` : ""}</h1>
      {park ? <p className="asset-detail-loc"><MapPin size={16}/><Link to={`/industrial-parks/${park.slug}`}>{tr(park.name,language)}</Link>{zone && <span>{" · "}{zone}</span>}</p> : <p className="missing-summary">{t("Chưa xác định được KCN liên kết. VSIP có thể hỗ trợ tìm mặt bằng.","The linked park is unavailable. VSIP can help find a property.","关联园区暂不可用，VSIP可协助寻找场地。")}</p>}
      {hasValue(asset.description) && <p className="asset-detail-description">{tr(asset.description,language)}</p>}
      {asOf && <small className="asset-detail-asof">{t("Cập nhật", "Updated", "更新")} {asOf} · {verification}</small>}
    </header>
    <div className="asset-gallery">
      <div className="asset-gallery-main"><SafeImage fallbackIllustration src={current?.url} alt={current?.caption && hasValue(current.caption) ? tr(current.caption, language) : name} /></div>
      {shots.length > 1 && <ul className="asset-gallery-thumbs" aria-label={t("Bộ ảnh mặt bằng", "Asset photos", "物业图片")}>
        {shots.map((s, i) => <li key={s.url}><button type="button" aria-pressed={i === shot} aria-label={`${t("Ảnh", "Photo", "图片")} ${i + 1}/${shots.length}`} onClick={() => setShot(i)}><SafeImage src={s.url} alt="" /></button></li>)}
      </ul>}
    </div>
    <div className="asset-detail-grid">
      <aside className="asset-offer" aria-label={t("Giá và điều kiện thuê", "Price and lease terms", "价格与租赁条件")}>
        <h2>{t("Giá và điều kiện thuê", "Price and lease terms", "价格与租赁条件")}</h2>
        <p className="asset-offer-price"><strong className={`asset-price${price.specific ? "" : " is-muted"}`}><span className="asset-price-amount">{price.amount}</span>{price.basis && <span className="asset-price-basis">{price.basis}</span>}</strong>{vat && <small className="asset-price-note">{vat}</small>}</p>
        {termRows.length > 0 && <dl className="asset-terms">{termRows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
        <div className="asset-offer-actions">
          {leased
            ? <Link className="button primary" to={park ? `/find-supply?${new URLSearchParams({parkId:park.id})}` : "/find-supply"}><Search/>{t("Tìm mặt bằng tương tự", "Find similar properties", "查找类似物业")}</Link>
            : <Link className="button primary" to={requestUrl}><Send/>{park ? ui(language, "Hỏi thuê mặt bằng này", "Enquire about this property") : ui(language, "Tư vấn thuê", "Leasing consultation")}</Link>}
          {park && <button className="button outline" type="button" onClick={() => openParkChat(park.id,asset.id)}><MessageCircle/>{ui(language, "Trao đổi với VSIP", "Chat with VSIP")}</button>}
          {park && !leased && <Link className="asset-visit-link" to={`${requestUrl}&support=meeting`}>{t("Đặt lịch khảo sát", "Book a site visit", "预约实地考察")}</Link>}
        </div>
        <p className="asset-offer-note">{t("Giá tham khảo; VSIP xác nhận khi báo giá.", "Reference price; VSIP confirms when quoting.", "价格仅供参考，以VSIP报价确认为准。")}</p>
      </aside>
      <div className="asset-detail-main">
        <OptionalSection show={visibleSpecs.length > 0} id="asset-specs" className="asset-detail-section">
          <SectionTitle eyebrow={t("THÔNG SỐ", "SPECIFICATIONS", "技术参数")} title={t("Thông số kỹ thuật", "Technical specifications", "技术参数")} />
          <FactGroup className="asset-spec-facts" facts={visibleSpecs} />
          {hasSpecData && <small className="asset-source-note">{asOf ? `${t("Cập nhật", "Updated", "更新")} ${asOf} · ` : ""}{verification}</small>}
        </OptionalSection>
        <OptionalSection show={ownUtilities.length > 0 || parkUtilities.length > 0} id="asset-infrastructure" className="asset-detail-section">
          <SectionTitle eyebrow={t("HẠ TẦNG", "INFRASTRUCTURE", "基础设施")} title={t("Hạ tầng và tiện ích", "Infrastructure and utilities", "基础设施与配套")} />
          {ownUtilities.length > 0 && <div className="utility-grid asset-utilities is-own">{ownUtilities.map(u => <article key={u.key}>{u.icon}<span>{u.label}</span><strong>{u.value}</strong></article>)}</div>}
          {parkUtilities.length > 0 && <>
            <h3 className="asset-subhead">{t("Hạ tầng chung của KCN", "Shared park infrastructure", "园区共用基础设施")}</h3>
            <div className="utility-grid asset-utilities is-shared">{parkUtilities.map(u => <article key={u.key}>{utilityIcon(u.key)}<span>{tr(u.label,language)}</span><SourceValue compact value={u.capacity} /></article>)}</div>
          </>}
        </OptionalSection>
        <OptionalSection show={industries.length > 0} id="asset-industries" className="asset-detail-section">
          <SectionTitle eyebrow={t("NGÀNH PHÙ HỢP", "SUITABLE INDUSTRIES", "适合行业")} title={t("Ngành nghề phù hợp", "Suitable industries", "适合行业")} />
          <div className="pill-list">{industries.map(i => <span key={i}><Check />{industryLabel(i, language)}</span>)}</div>
          {park?.slug && <p className="asset-section-link"><Link to={`/industrial-parks/${park.slug}`}>{t("Xem ngành thu hút đầu tư của KCN", "See the park's target industries", "查看园区重点行业")} <ArrowRight size={14}/></Link></p>}
        </OptionalSection>
        <OptionalSection show={!!park && (hasLot || hasCoords || !!lotPoint)} id="asset-location" className="asset-detail-section">
          <SectionTitle eyebrow={t("VỊ TRÍ", "LOCATION", "位置")} title={t("Vị trí trong khu công nghiệp", "Location in the park", "园区内位置")} />
          {park && (lotPoint || hasCoords) && <div className="asset-lot-row">
            <p><MapPin size={18} aria-hidden="true" /><span>{lotPoint ? <>{lot ? `${t("Lô", "Plot", "地块")} ${lot} · ` : ""}{tr(park.name, language)}{park.province ? ` · ${park.province}` : ""}<small>{t("Vị trí lô mang tính minh hoạ (dữ liệu demo)", "Plot position is illustrative (demo data)", "地块位置仅为示意（演示数据）")}</small></> : <>{t("Vị trí KCN", "Park location", "园区位置")} · {tr(park.name, language)}{park.province ? ` · ${park.province}` : ""}<small>{t("Chưa có vị trí lô; hiển thị vị trí khu công nghiệp", "No plot position yet; showing the park location", "暂无地块位置；显示园区位置")}</small></>}</span></p>
            <a className="button outline" href={googleMapsPlaceUrl((lotPoint || park.coordinates)!)} target="_blank" rel="noopener noreferrer">{t("Mở Google Maps", "Open in Google Maps", "在 Google Maps 中打开")}<ExternalLink size={14} aria-hidden="true" /></a>
          </div>}
          {park && hasLot && <ParkMasterplan assets={parkAssets} language={language} plan={park.masterplan} parkId={park.id} highlightAssetId={asset.id} />}
          {park && hasCoords && (park.places?.length ? <NearbyConnectivity park={park} language={language} lot={{ assetId: asset.id, code: lot || undefined, coordinates: lotPoint || undefined }} /> : <ParkLocationMap park={park} language={language} />)}
        </OptionalSection>
        <OptionalSection show={publicDocs.length > 0} id="asset-documents" className="asset-detail-section">
          <SectionTitle eyebrow={t("TÀI LIỆU", "DOCUMENTS", "文件")} title={t("Tài liệu công khai của KCN", "Public park documents", "园区公开文件")} />
          <div className="doc-list">{publicDocs.map(d => <article key={d.id}>
            <span className="doc-icon"><FileCheck2 /></span>
            <div><h3>{tr(d.title, language)}</h3><p>{tr(d.issuer, language)}{d.issueDate ? ` · ${formatDate(d.issueDate,language)||d.issueDate}` : ""}</p></div>
            {safeUrl(d.sourceUrl) ? <a href={d.sourceUrl} target="_blank" rel="noreferrer"><Download size={15}/>{ui(language, "Xem tài liệu", "View source")}</a> : <span className="document-unavailable">{emptyCopy(language,"Chưa có bản tải xuống","Download not available","暂无下载文件")}</span>}
          </article>)}</div>
        </OptionalSection>
      </div>
    </div>
    {park && others.length > 0 && <section id="asset-others" className="asset-detail-section asset-others">
      <SectionTitle eyebrow={t("TẠI CÙNG KCN", "IN THE SAME PARK", "同园区物业")} title={t("Mặt bằng khác trong khu công nghiệp", "Other assets in this park", "园区内其他物业")} />
      <div className="asset-grid profile-assets">{others.map(a => <AssetCard key={a.id} asset={a} context="park" />)}</div>
      <p className="asset-section-link"><Link className="button outline" to={parkAssetsUrl}>{t("Xem tất cả mặt bằng tại", "View all assets at", "查看全部物业：")} {tr(park.name,language)}</Link></p>
    </section>}
  </div>{!draft&&<MobileActionBar>{price.specific && <span className="mobile-bar-price">{price.amount}{price.basis && <small>{price.basis}</small>}</span>}<Link className="button primary" to={requestUrl}><Send size={16}/>{ui(language,"Gửi yêu cầu","Inquiry")}</Link>{park&&<button data-chat onClick={()=>openParkChat(park.id,asset.id)}><MessageCircle size={16}/>{ui(language,"Trao đổi","Chat")}</button>}</MobileActionBar>}</Shell>;
}

const emptyForm = {
  organization: "",
  contactName: "",
  email: "",
  phone: "",
  service: "Find Supply",
  assetType: "",
  industrialParkName: "",
  location: "",
  areaMin: "",
  areaMax: "",
  transaction: "lease",
  budgetOrPrice: "",
  industry: "",
  availabilityDate: "",
  requirements: "",
};
function RequestFormPage({ kind }: { kind: RequestKind }) {
  const mobile=useMobile();
  const { language, createRequest, parks, assets } = useRequestActions();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedAsset = assets.find((asset) => asset.id === searchParams.get("assetId") && isPublicAsset(asset,parks));
  const selectedPark = parks.find(
    (park) => park.id === (searchParams.get("parkId") || selectedAsset?.parkId) && isPublicPark(park),
  );
  const [form, setForm] = useState(() => ({
    ...emptyForm,
    assetType: selectedAsset
      ? selectedAsset.type
      : "",
    industrialParkName: selectedPark?.name.en || "",
    location: selectedPark?.province || "",
    areaMin: selectedAsset && selectedAsset.listingKind !== "project_inventory"
      ? String(selectedAsset.unit === "ha" ? selectedAsset.area * 10000 : selectedAsset.area)
      : "",
    areaMax: selectedAsset && selectedAsset.listingKind !== "project_inventory"
      ? String(selectedAsset.unit === "ha" ? selectedAsset.area * 10000 : selectedAsset.area)
      : "",
    transaction: selectedAsset?.transaction || "lease",
    industry: selectedAsset?.industries[0] || "",
    availabilityDate: selectedAsset?.availableFrom && selectedAsset.availableFrom>=new Date().toLocaleDateString("en-CA") ? selectedAsset.availableFrom : "",
    service: searchParams.get("support")==="meeting" ? "Meeting / Connection" : "Find Supply",
    requirements: selectedAsset && selectedPark
      ? language === "vi"
        ? `Tôi quan tâm đến ${tr(selectedAsset.name, language)} tại ${tr(selectedPark.name, language)}.`
        : language === "zh"
          ? `我对${tr(selectedPark.name, language)}的${tr(selectedAsset.name, language)}感兴趣。`
          : `I am interested in ${tr(selectedAsset.name, language)} at ${tr(selectedPark.name, language)}.`
      : "",
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isSupply = kind === "find_supply";
  const submitted=useRef(false);const requestKey=useRef(crypto.randomUUID());
  const [consent,setConsent]=useState(false);
  const [dateUnknown,setDateUnknown]=useState(false);
  const [priceMode,setPriceMode]=useState("");
  const [currency,setCurrency]=useState("USD");
  const [priceArea,setPriceArea]=useState("m²");
  const [pricePeriod,setPricePeriod]=useState("month");
  const basis=`${priceArea}/${pricePeriod}`;
  const [areaUnit,setAreaUnit]=useState<AreaUnit>("m2");
  const changeAreaUnit=(next:AreaUnit)=>{setForm(current=>({...current,areaMin:convertArea(current.areaMin,areaUnit,next),areaMax:convertArea(current.areaMax,areaUnit,next)}));setAreaUnit(next)};
  const update = (k: string, v: string) => setForm((x) => ({ ...x, [k]: v }));
  const choices:Partial<Record<keyof typeof form,string[]>>={
    assetType:['industrial_land','ready_built_factory','warehouse','build_to_suit'],
    industry:[...new Set(parks.filter(isPublicPark).flatMap(p=>p.suitableIndustries)),'Not specified'],
    location:[...new Set(parks.filter(isPublicPark).map(p=>p.province)),...(isSupply?['North','Central','South','Not specified']:[])],
  };
  async function submit(e: FormEvent) {
    e.preventDefault();
    if(submitted.current)return;
    const er: Record<string, string> = {};
    if(!leasingIntents.some(id=>id===form.service))er.service=emptyCopy(language,'Vui lòng chọn lại gói hỗ trợ.','Please select an available package.','请重新选择可用套餐。');
    Object.entries(choices).forEach(([key,options])=>{if(!options?.includes(form[key as keyof typeof form]))er[key]=ui(language,"Vui lòng chọn giá trị trong danh sách","Select a listed option")});
    if(!consent)er.consent=ui(language,"Vui lòng đồng ý sử dụng thông tin","Consent is required");
    if(!validPhone(form.phone))er.phone=ui(language,"Điện thoại cần 8–15 chữ số","Phone must contain 8–15 digits");
    if((searchParams.has("parkId")&&!selectedPark)||(searchParams.has("assetId")&&!selectedAsset)||(selectedAsset&&selectedPark&&selectedAsset.parkId!==selectedPark.id)||(selectedPark&&!isPublicPark(selectedPark)))er.context=ui(language,"KCN hoặc sản phẩm không còn phù hợp. Hãy mở lại từ danh mục.","Park or asset context is invalid. Reopen from the directory.");
    [
      "organization",
      "contactName",
      "email",
      "phone",
      "assetType",
      "location",
      "areaMin",
      "areaMax",
      "industry",
    ].forEach((k) => {
      if (!String(form[k as keyof typeof form]).trim())
        er[k] = ui(language, "Vui lòng nhập thông tin", "Required");
    });
    if(!dateUnknown&&!form.availabilityDate)er.availabilityDate=ui(language,"Chọn ngày hoặc Chưa xác định","Choose a date or Not specified");
    if(!priceMode||(priceMode==="specific"&&(!(+form.budgetOrPrice>0)||!["VND","USD"].includes(currency)||!["m²","ha"].includes(priceArea)||!["month","year","lease term"].includes(pricePeriod))))er.budgetOrPrice=ui(language,"Chọn chế độ giá; giá cụ thể cần số dương, tiền tệ và đơn vị định giá","Choose a price mode; a specific price needs a positive amount, currency and pricing basis");
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email))
      er.email =
        ui(language, "Địa chỉ email không hợp lệ", "Invalid email");
    if (
      !Number.isFinite(+form.areaMin) || !Number.isFinite(+form.areaMax) ||
      +form.areaMin <= 0 ||
      +form.areaMax <= 0 ||
      +form.areaMin > +form.areaMax
    )
      er.areaMin =
        ui(language, "Khoảng diện tích không hợp lệ", "Invalid area range");
    if (
      !dateUnknown && form.availabilityDate &&
      new Date(form.availabilityDate) < new Date(new Date().toDateString())
    )
      er.availabilityDate =
        ui(language, "Thời điểm bàn giao phải từ hôm nay trở đi", "Date must be in the future");
    setErrors(er);
    if (Object.keys(er).length) return;
    if(!validLeasingContext({kind,transaction:form.transaction as 'lease'|'sale',service:form.service,parkId:selectedPark?.id,assetId:selectedAsset?.id},parks,assets)||searchParams.get('transaction')&&searchParams.get('transaction')!=='lease'){
      setErrors({context:emptyCopy(language,'Chỉ tiếp nhận nhu cầu thuê mặt bằng trong danh mục demo hiện tại.','Only leasing enquiries for the current demo portfolio are accepted.','仅接受当前演示园区内物业的租赁咨询。')});return;
    }
    submitted.current=true;let id:string;try{id = await createRequest({
      parkId:selectedPark?.id,assetId:selectedAsset?.id,entrySource:selectedAsset?"asset":selectedPark?"park":"form",consent,
      ...form,
      idempotencyKey:requestKey.current,dateUnknown,budget:{mode:priceMode as 'specific'|'negotiable'|'not_available',amount:priceMode==='specific'?+form.budgetOrPrice:null,currency:currency as 'VND'|'USD',areaBasis:priceArea as 'm²'|'ha',period:(pricePeriod==='lease term'?'term':pricePeriod) as 'month'|'year'|'term'},
      budgetOrPrice:priceMode==="specific"?`${currency} ${form.budgetOrPrice}/${basis}`:priceMode==="negotiable"?"Negotiable":"Not specified",
      availabilityDate:dateUnknown?"":form.availabilityDate,
      kind,
      areaMin: Number((+form.areaMin * areaFactors[areaUnit]).toPrecision(15)),
      areaMax: Number((+form.areaMax * areaFactors[areaUnit]).toPrecision(15)),
      transaction: form.transaction as "lease" | "sale",
    });
    }catch{submitted.current=false;setErrors({context:emptyCopy(language,'Không thể lưu yêu cầu. Vui lòng thử lại.','Unable to save the enquiry. Please retry.','无法保存咨询，请重试。')});return;}
    submitted.current=true;
    navigate(`/request-confirmation/${id}`);
  }
  const field = (key: keyof typeof form, label: string, type = "text") => (
    <label data-field={key} className={errors[key] ? "invalid" : ""}>
      <span>{label} *</span>
      {key==='areaMin'||key==='areaMax'||key==='budgetOrPrice'?<AreaInput value={form[key]} onChange={value=>update(key,value)} language={language}/>:choices[key]?<select value={form[key]} onChange={e=>update(key,e.target.value)}><option value="">{ui(language,"Chọn thông tin","Choose an option")}</option>{choices[key]!.map(value=><option key={value} value={value}>{key==='assetType'?tr(labels[value as keyof typeof labels],language):key==='industry'?industryLabel(value,language):key==='location'?ui(language,({North:'Miền Bắc',Central:'Miền Trung',South:'Miền Nam','Not specified':'Chưa xác định'} as Record<string,string>)[value]||value,value):dataText(value,language)}</option>)}</select>:<input
        type={type}
        value={form[key]}
        onChange={(e) => update(key, e.target.value)}
      />}
      {errors[key] && <small>{errors[key]}</small>}
    </label>
  );
  return (
    <PublicShell>
      <div className="request-hero">
        <div className="page">
          <span>
            {isSupply
              ? emptyCopy(language,"TƯ VẤN THUÊ","LEASING CONSULTATION","租赁咨询")
              : ui(language, "TÌM KHÁCH THUÊ/MUA", "FIND DEMAND")}
          </span>
          <h1>
            {mobile ? (isSupply?emptyCopy(language,"Gửi nhu cầu thuê","Send leasing enquiry","提交租赁咨询"):emptyCopy(language,"Gửi thông tin chào thuê","Offer your property","提交出租信息")) : isSupply
              ? emptyCopy(language,"Nhu cầu thuê mặt bằng sản xuất tại VSIP","Your manufacturing space requirements at VSIP","您的VSIP生产空间租赁需求")
              : ui(language, "Tìm khách thuê hoặc bên nhận chuyển nhượng phù hợp", "Find the right tenant or buyer")}
          </h1>
          <p>
            {ui(language, "Bộ phận Tiếp thị & Cho thuê tiếp nhận nhu cầu thuê mặt bằng tại VSIP.", "The Marketing & Leasing Department handles enquiries for space at VSIP.")}
          </p>
        </div>
      </div>
      <div className="page request-layout">
        <form className="request-form" onSubmit={submit}>
          {Object.keys(errors).length>0&&<div role="alert" className="admin-message error">{Object.values(errors).join(" · ")}</div>}
          {selectedAsset&&<div className="form-section"><b>{tr(selectedAsset.name,language)}</b><p>{selectedPark&&tr(selectedPark.name,language)} · {ui(language,"Ngữ cảnh chỉ đọc từ sản phẩm","Read-only product context")}</p></div>}
          <div className="form-section">
            <h2>
              1.{" "}
              {isSupply
                ? ui(language, "Nhu cầu mặt bằng công nghiệp", "Industrial requirement")
                : ui(language, "Thông tin mặt bằng chào thuê/chuyển nhượng", "Industrial asset offering")}
            </h2>
            <div className="form-grid">
              {field(
                "assetType",
                ui(language, "Loại hình bất động sản", "Asset type"),
              )}
              <label>
                <span>{ui(language, "Tên khu công nghiệp", "Industrial park name")}</span>
                <select
                  value={form.industrialParkName}
                  disabled={!!selectedPark}
                  onChange={(e) => update("industrialParkName", e.target.value)}
                >
                  <option value="">
                    {ui(language, "Chưa xác định", "Not specified")}
                  </option>
                  {parks.filter(p=>isPublicPark(p)).map((park) => (
                    <option key={park.id} value={park.name.en}>
                      {tr(park.name, language)}
                    </option>
                  ))}
                </select>
              </label>
              {field(
                "location",
                isSupply
                  ? ui(language, "Tỉnh/thành hoặc khu vực mong muốn", "Preferred location")
                  : ui(language, "Vị trí mặt bằng", "Asset location"),
              )}{" "}
              <label data-field="areaUnit"><span>{emptyCopy(language,"Đơn vị diện tích","Area unit","面积单位")}</span><select value={areaUnit} onChange={e=>changeAreaUnit(e.target.value as AreaUnit)}><option value="m2">m²</option><option value="ha">{emptyCopy(language,"Hecta (ha)","Hectare (ha)","公顷 (ha)")}</option><option value="km2">km²</option></select></label>
              {field("areaMin", `${emptyCopy(language,"Diện tích từ","Minimum area","最小面积")} (${areaUnit==='m2'?'m²':areaUnit==='km2'?'km²':'ha'})`)}
              {field("areaMax", `${emptyCopy(language,"Diện tích đến","Maximum area","最大面积")} (${areaUnit==='m2'?'m²':areaUnit==='km2'?'km²':'ha'})`)}
              <label><span>{ui(language,"Chế độ giá/ngân sách","Budget / price mode")} *</span><select value={priceMode} onChange={e=>setPriceMode(e.target.value)}><option value="">{ui(language,"Chọn chế độ","Choose a mode")}</option><option value="specific">{ui(language,"Giá cụ thể","Specific price")}</option><option value="negotiable">{ui(language,"Thỏa thuận","Negotiable")}</option><option value="not_specified">{ui(language,"Chưa xác định","Not specified")}</option></select></label>
              {priceMode==="specific"&&<>
                {field("budgetOrPrice",emptyCopy(language,"Số tiền","Amount","金额"),"number")}
                <label data-field="currency"><span>{emptyCopy(language,"Tiền tệ","Currency","币种")}</span><select value={currency} onChange={e=>setCurrency(e.target.value)}><option value="VND">VND</option><option value="USD">USD</option></select></label>
                <label data-field="priceArea"><span>{emptyCopy(language,"Giá theo diện tích","Price per area","计价面积单位")}</span><select value={priceArea} onChange={e=>setPriceArea(e.target.value)}><option value="m²">m²</option><option value="ha">ha</option></select></label>
                <label data-field="pricePeriod"><span>{emptyCopy(language,"Kỳ tính giá","Pricing period","计价周期")}</span><select value={pricePeriod} onChange={e=>setPricePeriod(e.target.value)}><option value="month">{emptyCopy(language,"Tháng","Month","月")}</option><option value="year">{emptyCopy(language,"Năm","Year","年")}</option><option value="lease term">{emptyCopy(language,"Kỳ thuê","Lease term","租期")}</option></select></label>
              </>}

              {field(
                "industry",
                isSupply
                  ? ui(language, "Ngành nghề dự kiến", "Intended industry")
                  : ui(language, "Ngành nghề tiếp nhận", "Suitable industry"),
              )}
              {!dateUnknown&&field("availabilityDate",ui(language,"Thời điểm bàn giao","Required date"),"date")}
              <label className="date-unknown-row"><input type="checkbox" checked={dateUnknown} onChange={e=>setDateUnknown(e.target.checked)}/>{ui(language,"Chưa xác định ngày bàn giao","Date not specified")}</label>
            </div>
            <label>
              <span>
                {ui(language, "Yêu cầu về điện, hạ tầng kỹ thuật, môi trường và điều kiện khác", "Technical, infrastructure and other requirements")}
              </span>
              <textarea
                value={form.requirements}
                onChange={(e) => update("requirements", e.target.value)}
                rows={4}
              />
            </label>
          </div>
          <div className="form-section">
            <h2>
              2.{" "}
              {ui(language, "Thông tin doanh nghiệp và đầu mối liên hệ", "Organisation and contact")}
            </h2>
            <div className="form-grid">
              {field(
                "organization",
                ui(language, "Tên doanh nghiệp", "Organisation"),
              )}
              {field(
                "contactName",
                ui(language, "Họ tên người liên hệ", "Contact name"),
              )}
              {field("email", ui(language, "Email", "Email"), "email")}
              {field("phone", ui(language, "Số điện thoại", "Phone"))}
            </div>
          </div>
          <div className="form-section leasing-intents">
            <h2>{emptyCopy(language,'3. Nội dung cần hỗ trợ','3. How can we help?','3. 您需要什么帮助？')}</h2>
            <p>{language === "en" ? `VSIP ${leasingTeam(language)}` : `${leasingTeam(language)} VSIP`}</p>
            {leasingIntents.map(intent=><label key={intent}><input type="radio" name="leasing-intent" value={intent} checked={form.service===intent} onChange={()=>update('service',intent)}/>{leasingIntentLabel(intent,language)}</label>)}
            {form.service==='Meeting / Connection'&&<p role="note">{emptyCopy(language,'Yêu cầu khảo sát cần được Bộ phận Tiếp thị & Cho thuê xác nhận; đây chưa phải lịch hẹn.','The Marketing & Leasing Department must confirm your site visit request; this is not a confirmed appointment.','实地考察申请需由市场推广与租赁部确认，尚不代表已预约成功。')}</p>}
          </div>
          <label className="consent">
            <input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)}/>
            {ui(language, "Tôi đồng ý để VSIP sử dụng thông tin đã cung cấp nhằm phản hồi nhu cầu thuê của tôi.", "I agree that VSIP may use this information to respond to my leasing enquiry.")}
          </label>
          <button className="button primary submit">
            <Send />
            {ui(language, "Gửi nhu cầu thuê", "Send leasing enquiry")}
          </button>
        </form>
        <aside className="request-aside">
          <ShieldCheck />
          <h3>
            {ui(language, "Quy trình tư vấn thuê", "Leasing consultation process")}
          </h3>
          {[
            ui(language, "Tiếp nhận yêu cầu", "Receive request"),
            ui(language, "Rà soát và xác minh", "Verify information"),
            ui(language, "Tư vấn mặt bằng phù hợp", "Propose suitable space"),
            ui(language, "Tiếp nhận yêu cầu khảo sát", "Receive site visit request"),
          ].map((x, i) => (
            <div key={x}>
              <span>{i + 1}</span>
              <b>{x}</b>
            </div>
          ))}
          <small>
            {ui(language, "Phiên bản demo mô phỏng tiếp nhận nhu cầu thuê; không gửi dữ liệu ra ngoài hoặc xác nhận lịch khảo sát.", "This demo simulates leasing enquiries; it sends no data externally and does not confirm site visits.")}
          </small>
        </aside>
      </div>
    </PublicShell>
  );
}
function ConfirmationPage() {
  const { id } = useParams();
  const { language, requests, ownRequestIds } = useApp();
  const r = requests.find((x) => x.id === id && ownRequestIds.includes(x.id));
  if(!r||r.kind!=="find_supply")return <PublicShell><div className="page section"><StatePanel kind="not_found" title={emptyCopy(language,"Không thể xem xác nhận yêu cầu","Request confirmation unavailable","无法查看需求确认")} text={emptyCopy(language,"Không tìm thấy yêu cầu thuộc phiên hiện tại. Dữ liệu demo có thể đã mất sau khi tải lại trang; màn hình này không xác nhận yêu cầu đã được gửi.","No request belonging to this session was found. Demo data may have been reset after a refresh; this screen does not confirm submission.","未找到属于当前会话的需求。刷新后演示数据可能已重置；此页面不代表需求已提交。")} action={<Link className="button primary" to="/find-supply">{ui(language,"Gửi nhu cầu mới","Submit a request")}</Link>}/></div></PublicShell>;
  return (
    <PublicShell>
      <div className="page confirmation">
        <CheckCircle2 />
        <span>
          {ui(language, "ĐÃ GHI NHẬN TRONG DEMO", "RECORDED IN DEMO")}
        </span>
        <h1>
          {ui(language, "Nhu cầu thuê đã được ghi nhận trong phiên demo", "Your leasing enquiry was recorded in this demo session")}
        </h1>
        <p>
          {ui(language, "Mã tham chiếu", "Reference")}: <b>{id}</b>
        </p>
        {r && (
          <div className="confirmation-card">
            <div>
              <small>
                {ui(language, "Doanh nghiệp", "Organisation")}
              </small>
              <b>{r.organization}</b>
            </div>
            <div>
              <small>{ui(language, "Nội dung cần hỗ trợ", "Enquiry purpose")}</small>
              <b>{leasingIntentLabel(r.service, language)}</b>
            </div>
            {r.industrialParkName && (
              <div>
                <small>{ui(language, "Khu công nghiệp", "Industrial park")}</small>
                <b>{r.industrialParkName}</b>
              </div>
            )}
            <div>
              <small>{ui(language, "Trạng thái", "Status")}</small>
              <Badge value={r.status} />
            </div>
          </div>
        )}
        <p>
          {ui(language, "Bản demo không gửi dữ liệu ra bên ngoài. Khi vận hành thực tế, Bộ phận Tiếp thị & Cho thuê sẽ tiếp nhận và phản hồi nhu cầu.", "This demo sends no data externally. In live operation, the Marketing & Leasing Department would receive and respond to your enquiry.")}
        </p>
        <div>
          <Link className="button primary" to="/industrial-parks">
            {ui(language, "Tiếp tục khám phá", "Continue exploring")}
          </Link>
          <Link className="button outline" to="/home">
            {ui(language, "Trang chủ", "Home")}
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}
function RetiredPublicFlow({event=false}:{event?:boolean}) {
  const {language}=useApp();
  return <PublicShell><div className="page section"><StatePanel title={event?emptyCopy(language,'Thông tin sự kiện chưa được công bố','Event information is not published','活动信息尚未公布'):emptyCopy(language,'Luồng tiếp nhận này đã ngừng','This intake flow has been retired','此受理流程已停用')} text={emptyCopy(language,'Website phục vụ doanh nghiệp tìm thuê mặt bằng tại các KCN VSIP. Không tiếp nhận mặt bằng chào thuê từ bên ngoài.','This website serves businesses seeking space in VSIP parks. External property offerings are not accepted.','本网站为寻找VSIP园区租赁空间的企业服务，不接受外部物业招租信息。')} action={<Link className="button primary" to="/find-supply">{leasingIntentLabel('Find Supply',language)}</Link>}/></div></PublicShell>;
}
function ExpoPage(){return <PublicShell><div className="page page-top"><TradeExpoSection/></div></PublicShell>}
function AdminGuard({ children }: { children: ReactNode }) {
  const admin=useAdmin(),{pathname}=useLocation();
  useEffect(()=>{if(!admin.current)admin.enterDemo()},[admin.current,admin.enterDemo]);
  const {language}=useApp();
  if(!admin.current)return <div className="vsip-admin admin-loading"><aside className="workspace-sidebar" aria-hidden="true">{Array.from({length:8},(_,i)=><span key={i} className="skeleton skeleton-nav"/>)}</aside><div className="workspace-main"><header className="workspace-header"><span className="skeleton skeleton-title"/></header><main className="admin-surface">{admin.remoteError?<div className="admin-panel" role="alert"><h2>{emptyCopy(language,'Không thể kết nối máy chủ','Unable to connect','无法连接服务器')}</h2><p>{emptyCopy(language,'Kiểm tra mạng rồi thử lại.','Check your connection and try again.','请检查网络后重试。')}</p><button className="button primary" onClick={admin.enterDemo}>{emptyCopy(language,'Thử lại','Retry','重试')}</button></div>:<div role="status" aria-label={emptyCopy(language,'Đang tải dữ liệu…','Loading data…','正在加载数据…')}><span className="skeleton skeleton-h1"/><div className="skeleton-grid">{Array.from({length:4},(_,i)=><span key={i} className="skeleton skeleton-card"/>)}</div><span className="skeleton skeleton-block"/></div>}</main></div></div>;
  return pathname==='/admin/no-access'?<>{children}</>:<Access permission={routePermission(pathname)}>{children}</Access>;
}
function AdminShell({children}:{children:ReactNode}) {return <AdminFrame>{children}</AdminFrame>}

function ExpoTrendChart({ data }: { data: ExpoDailyMetric[] }) {
  const { language } = useApp();
  if (!data.length) return <StatePanel title={emptyCopy(language,"Chưa có dữ liệu biểu đồ","No chart data available","暂无图表数据")} text={emptyCopy(language,"Chưa có số liệu theo ngày để hiển thị. Không quy đổi dữ liệu thiếu thành số 0.","Daily figures are not available. Missing data is not treated as zero.","暂无每日数据，不将缺失数据视为零。")}/>;
  const width = 660;
  const height = 220;
  const chartTop = 20;
  const chartBottom = 174;
  const left = 28;
  const right = 642;
  const max = Math.max(1, ...data.flatMap((item) => [item.requests, item.connections]));
  const point = (value: number, index: number) => {
    const x = data.length === 1 ? left : left + (index / (data.length - 1)) * (right - left);
    const y = chartBottom - (value / max) * (chartBottom - chartTop);
    return `${x},${y}`;
  };
  const requestPoints = data.map((item, index) => point(item.requests, index)).join(" ");
  const connectionPoints = data.map((item, index) => point(item.connections, index)).join(" ");
  return (
    <div className="expo-trend-chart">
      <div className="chart-legend">
        <span><i className="request" />{ui(language, "Kết nối", "Connections")}</span>
        <span><i className="connection" />{ui(language, "Thành công", "Completed")}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ui(language, "Biểu đồ xu hướng kết nối", "Connection trend chart")}>
        {[0, 1, 2, 3].map((line) => {
          const y = chartTop + (line / 3) * (chartBottom - chartTop);
          return <line key={line} x1={left} x2={right} y1={y} y2={y} className="chart-grid-line" />;
        })}
        <polyline points={requestPoints} className="chart-line request-line" />
        <polyline points={connectionPoints} className="chart-line connection-line" />
        {data.map((item, index) => {
          const x = data.length === 1 ? left : left + (index / (data.length - 1)) * (right - left);
          return <text key={item.date} x={x} y="205" textAnchor="middle">{item.date}</text>;
        })}
      </svg>
    </div>
  );
}

function ExpoStatus({ expo }: { expo: ExpoProgram }) {
  return <Badge value={expo.status} tone={expo.status === "live" ? "green" : "amber"} />;
}

function RequestTable({ requests }: { requests: IndustrialRequest[] }) {
  const { language } = useApp();
  const admin = useAdmin();
  return (
    <div className="table-wrap">
      <DataTable>
        <thead>
          <tr>
            <th>ID</th>
            <th>{ui(language, "Doanh nghiệp", "Organisation")}</th>
            <th>{ui(language, "Tỉnh/thành, khu vực", "Location")}</th>
            <th>{emptyCopy(language,"Ngành","Industry","行业")}</th>
            <th>{emptyCopy(language,"Diện tích","Area","面积")}</th>
            <th>{emptyCopy(language,"Người phụ trách","Assignee","负责人")}</th>
            <th>{ui(language, "Trạng thái", "Status")}</th>
            <th>{emptyCopy(language,"Thời gian chờ","Waiting","等待时间")}</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => (
            <tr key={r.id}>
              <td>
                <Link className="nowrap" to={`/admin/requests/${r.id}`}>{r.id}</Link>
              </td>
              <td>
                <b>{r.organization}</b>
                <small>{optionText(assetTypeKey(r.assetType),language)}{r.kind!=='find_supply'?` · ${emptyCopy(language,'Yêu cầu cũ','Legacy','历史记录')}`:''}</small>
              </td>
              <td>{optionText(regionKey(r.location),language)}</td>
              <td>{r.industry?industryLabel(r.industry,language):"—"}</td>
              <td className="num">{areaRange(r.areaMin,r.areaMax,language)}</td>
              <td>{admin.store.users.find((u) => u.id === r.assignedTo)?.name || <span className="muted">{emptyCopy(language,"Chưa phân công","Unassigned","未分配")}</span>}</td>
              <td>
                <Badge value={r.status} tone={`status-${r.status}`} />
              </td>
              <td>
                <span
                  className={
                    ["submitted", "under_review"].includes(r.status)
                      ? "sla warn"
                      : "sla"
                  }
                >
                  {["submitted", "under_review"].includes(r.status)
                    ? (ageDays(r.submittedAt)?`${ageDays(r.submittedAt)} ${emptyCopy(language,"ngày chờ","days waiting","天待处理")}`:emptyCopy(language,"Mới hôm nay","New today","今日新增"))
                    : emptyCopy(language, "Không chờ phản hồi", "Not awaiting response", "无需等待回复")}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </div>
  );
}
function AdminRequests() {
  const { language, requests } = useApp();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const filtered = requests.filter(
    (r) =>
      (!q ||
        `${r.id} ${r.organization}`.toLowerCase().includes(q.toLowerCase())) &&
      (status === "all" || r.status === status),
  );
  return (
    <AdminShell>
      <div className="admin-page">
        <div className="admin-title">
          <div>
                        <h1>
              {emptyCopy(language,"Nhu cầu thuê","Leasing enquiries","租赁需求")}
            </h1>
            <p>
              {emptyCopy(language,"Bộ phận Tiếp thị & Cho thuê tiếp nhận, tư vấn và sắp xếp khảo sát.","The Marketing & Leasing Department handles enquiries, advice and site visits.","市场推广与租赁部负责咨询、方案建议和考察安排。")}
            </p>
          </div>
        </div>
        <div className="admin-filter">
          <label>
            {emptyCopy(language,"Tìm yêu cầu","Search enquiries","搜索需求")}
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={
                emptyCopy(language, "Tìm mã hoặc doanh nghiệp", "Search ID or organisation", "搜索编号或企业")
              }
            />
          </label>
          <label>{emptyCopy(language,"Trạng thái","Status","状态")}<select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">
              {emptyCopy(language, "Tất cả trạng thái", "All statuses", "全部状态")}
            </option>
            {Object.keys(requestTransitions).map((x) => (
              <option value={x} key={x}>
                {labels[x]
                  ? tr(labels[x], language)
                  : dataText(x.replace("_", " "), language)}
              </option>
            ))}
          </select></label>
        </div>
        <section className="admin-flat">
          {filtered.length ? <RequestTable requests={filtered} /> : <StatePanel kind={requests.length ? "no_results" : "empty"}
            title={emptyCopy(language,requests.length ? "Không có yêu cầu phù hợp" : "Chưa có yêu cầu kết nối",requests.length ? "No matching requests" : "No connection requests yet",requests.length ? "没有符合条件的需求" : "暂无连接需求")}
            text={emptyCopy(language,"Yêu cầu sẽ xuất hiện tại đây khi được tiếp nhận. Nếu đang lọc, hãy thử mở rộng điều kiện.","Requests appear here once received. If filters are active, try broadening them.","收到需求后将在此显示。如果已筛选，请扩大筛选范围。")}
            action={(q || status !== "all") && <button className="button primary" onClick={() => {setQ("");setStatus("all");}}>{ui(language,"Xóa bộ lọc","Clear filters")}</button>}/>}
        </section>
      </div>
    </AdminShell>
  );
}
function AppRoutes() {
  const {dataLoading,dataError,language}=useApp();const location=useLocation();
  if(remoteEnabled&&!location.pathname.startsWith('/admin')&&!location.pathname.startsWith('/portal')&&(dataLoading||dataError))return <><Header/><main className="page section"><p role="status">{dataError?emptyCopy(language,'Không tải được dữ liệu. Vui lòng thử lại.','Unable to load data. Please retry.','无法加载数据，请重试。'):emptyCopy(language,'Đang tải dữ liệu…','Loading data…','正在加载数据…')}</p>{dataError&&<button className="button" onClick={()=>window.dispatchEvent(new Event('vsip-public-refresh'))}>{emptyCopy(language,'Thử lại','Retry','重试')}</button>}</main></>;
  return (
    <Routes>
      {import.meta.env.DEV && <Route path="/demo/empty-states" element={<PublicShell><StatePreview /></PublicShell>} />}
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/industrial-parks" element={<ParksPage />} />
      <Route path="/industrial-parks/:slug" element={<ParkDetailPage />} />
      <Route path="/assets" element={<AssetsPage />} />
      <Route path="/assets/:id" element={<AssetDetailPage />} />
      <Route
        path="/find-demand"
        element={<RetiredPublicFlow />}
      />
      <Route
        path="/find-supply"
        element={<RequestFormPage kind="find_supply" />}
      />
      <Route path="/request-confirmation/:id" element={<ConfirmationPage />} />
      <Route path="/industrial-expo" element={<RetiredPublicFlow event />} />
      <Route path="/login" element={<Navigate to="/admin/login" replace/>} />
      <Route path="/admin/login" element={<Navigate to="/admin" replace/>}/>
      <Route path="/admin/assistant" element={<AdminGuard><AdminShell><AdminAssistant/></AdminShell></AdminGuard>}/>
      <Route path="/admin/internal" element={<InternalAccess/>}/>
      <Route path="/portal/*" element={<Suspense fallback={portalFallback}><PortalApp/></Suspense>}/>
      <Route path="/admin/park-owners" element={<Suspense fallback={portalFallback}><AdminOwnersList/></Suspense>}/>
      <Route path="/admin/industrial-parks/:parkId/owners" element={<Suspense fallback={portalFallback}><AdminOwnerDetail/></Suspense>}/>
      <Route path="/admin" element={<AdminEntry/>}/>
      <Route path="/admin/packages" element={<AdminGuard><AdminShell><PackageSettings/></AdminShell></AdminGuard>}/>
      <Route path="/admin/permissions" element={<AdminGuard><AdminShell><PermissionMatrix/></AdminShell></AdminGuard>}/>
      <Route path="/accept-invitation/:token" element={<AcceptInvitation />} />
      <Route path="/admin/no-access" element={<AdminGuard><AdminShell><AdminNoAccess/></AdminShell></AdminGuard>} />
      <Route path="/admin/users" element={<AdminGuard><AdminShell><UsersPage /></AdminShell></AdminGuard>} />
      <Route path="/admin/imports" element={<AdminGuard><AdminShell><BatchImport /></AdminShell></AdminGuard>} />
      <Route path="/admin/assets" element={<AdminGuard><AdminShell><ContentList kind="asset" /></AdminShell></AdminGuard>} />
      <Route path="/admin/assets/new" element={<AdminGuard><AdminShell><ContentEditor key="new-asset" kind="asset" /></AdminShell></AdminGuard>} />
      <Route path="/admin/assets/:id/edit" element={<AdminGuard><AdminShell><ContentEditor kind="asset" /></AdminShell></AdminGuard>} />
      <Route path="/admin/industrial-parks/new" element={<AdminGuard><AdminShell><ContentEditor key="new-park" kind="park" /></AdminShell></AdminGuard>} />
      <Route path="/admin/industrial-parks/:id/edit" element={<AdminGuard><AdminShell><ContentEditor kind="park" /></AdminShell></AdminGuard>} />
      <Route
        path="/admin/dashboard"
        element={
          <AdminGuard>
            <AdminShell><ConnectionDashboard /></AdminShell>
          </AdminGuard>
        }
      />
      <Route
        path="/admin/expos"
        element={
          <AdminGuard>
            <AdminShell><ExpoDirectoryAdmin /></AdminShell>
          </AdminGuard>
        }
      />
      <Route
        path="/admin/expos/:id"
        element={
          <AdminGuard>
            <AdminShell><ExpoReport /></AdminShell>
          </AdminGuard>
        }
      />
      <Route
        path="/admin/requests"
        element={
          <AdminGuard>
            <AdminRequests />
          </AdminGuard>
        }
      />
      <Route
        path="/admin/requests/:id"
        element={
          <AdminGuard>
            <AdminShell><ConnectionDetail /></AdminShell>
          </AdminGuard>
        }
      />
      <Route
        path="/admin/industrial-parks"
        element={
          <AdminGuard>
            <AdminShell><ContentList kind="park" /></AdminShell>
          </AdminGuard>
        }
      />
      <Route
        path="/admin/industrial-parks/:id"
        element={
          <AdminGuard>
            <AdminShell><ContentEditor kind="park" /></AdminShell>
          </AdminGuard>
        }
      />
      <Route path="/admin/*" element={<AdminGuard><AdminShell><AdminNotFound/></AdminShell></AdminGuard>}/>
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
export function AdminNotFound(){const a=useAdmin(),{language}=useApp();return <div className="admin-page"><StatePanel kind="not_found" title={emptyCopy(language,"Không tìm thấy trang quản trị","Admin page not found","未找到管理页面")} text={emptyCopy(language,"Địa chỉ này không tồn tại trong khu quản trị. Kiểm tra lại đường dẫn hoặc quay về Tổng quan.","This address does not exist in the admin area. Check the link or go back to the overview.","管理区域中不存在此地址。请检查链接或返回概览。")} action={<Link className="button primary" to={firstAdminPage(a.current,a.store.matrix)}>{emptyCopy(language,"Về Tổng quan","Back to Overview","返回概览")}</Link>}/></div>}
function AdminNoAccess(){const {language}=useApp();return <StatePanel kind="forbidden" title={emptyCopy(language,"Chưa có quyền truy cập","No accessible modules","无可访问模块")} text={emptyCopy(language,"Liên hệ Super Admin để được cấp quyền.","Contact your Super Admin to review your access.","请联系超级管理员审核权限。")}/>}
function AdminEntry(){const a=useAdmin();return <AdminGuard><Navigate to={firstAdminPage(a.current,a.store.matrix)} replace/></AdminGuard>}
export default function App() {
  // Convert saved legacy hash links before the browser router reads the location.
  if(window.location.hash.startsWith('#/')){const target=window.location.hash.slice(1);if(target.startsWith('/')&&!target.startsWith('//'))window.history.replaceState(null,'',target);}

  return (
    <AppProvider>
      <AdminProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
      </AdminProvider>
    </AppProvider>
  );
}
