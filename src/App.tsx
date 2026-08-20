import { CSSProperties, FormEvent, ReactNode, useMemo, useState } from "react";
import {
  HashRouter,
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
  ExternalLink,
  Factory,
  FileCheck2,
  FileText,
  Filter,
  Globe2,
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
  Warehouse,
  X,
  Zap,
} from "lucide-react";
import { AppProvider, tr, useApp } from "./AppContext";
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
const industryVi: Record<string, string> = {
  Electronics: "Điện tử",
  Semiconductors: "Bán dẫn",
  Automotive: "Ô tô và linh kiện",
  "Supporting industries": "Công nghiệp hỗ trợ",
  "Food processing": "Chế biến thực phẩm",
  Logistics: "Logistics",
  "Precision engineering": "Cơ khí chính xác",
  "Data centers": "Trung tâm dữ liệu",
  "Renewable energy equipment": "Thiết bị năng lượng tái tạo",
  "Electrical equipment": "Thiết bị điện",
  "Battery systems": "Hệ thống pin và lưu trữ năng lượng",
  "Electronic components": "Linh kiện điện tử",
  "Industrial automation": "Tự động hóa công nghiệp",
  Pharmaceuticals: "Dược phẩm",
  "Medical devices": "Thiết bị y tế",
  Biotechnology: "Công nghệ sinh học",
  "Laboratory equipment": "Thiết bị phòng thí nghiệm",
  "Industrial machinery": "Máy móc công nghiệp",
  "Metal fabrication": "Gia công kim loại",
  "Advanced materials": "Vật liệu công nghệ cao",
  "Industrial components": "Linh kiện công nghiệp",
  "Construction technology": "Công nghệ xây dựng",
  Textiles: "Dệt",
  Garments: "May mặc",
  Footwear: "Da giày",
  Packaging: "Bao bì",
  "Smart electronics": "Điện tử thông minh",
  Beverages: "Đồ uống",
  "Cold-chain logistics": "Logistics chuỗi lạnh",
  Furniture: "Nội thất",
  "Engineered wood": "Gỗ kỹ thuật",
  "Agricultural machinery": "Máy nông nghiệp",
  "Seafood processing": "Chế biến thủy sản",
  "Cold storage": "Kho lạnh",
  "Marine logistics": "Logistics hàng hải",
  Robotics: "Robot công nghiệp",
  "Consumer electronics": "Điện tử tiêu dùng",
  "Aerospace components": "Linh kiện hàng không",
  "Engineered rubber": "Cao su kỹ thuật",
  Warehousing: "Kho vận",
  "Solar equipment": "Thiết bị điện mặt trời",
  "Agricultural processing": "Chế biến nông sản",
  "Port logistics": "Logistics cảng",
  "Offshore energy equipment": "Thiết bị năng lượng ngoài khơi",
  "Steel fabrication": "Gia công kết cấu thép",
  "Rice processing": "Chế biến lúa gạo",
  "Food biotechnology": "Công nghệ sinh học thực phẩm",
  Biomaterials: "Vật liệu sinh học",
  "Biomass energy": "Năng lượng sinh khối",
  "Sustainable packaging": "Bao bì bền vững",
  "Aquaculture processing": "Chế biến thủy sản nuôi trồng",
  "Animal feed": "Thức ăn chăn nuôi",
  "Export logistics": "Logistics xuất khẩu",
  "Supply chain": "Chuỗi cung ứng",
};
const industryZh: Record<string, string> = {
  Electronics: "电子产业",
  Semiconductors: "半导体",
  Automotive: "汽车及零部件",
  "Supporting industries": "配套产业",
  "Food processing": "食品加工",
  Logistics: "物流",
  "Precision engineering": "精密工程",
  "Data centers": "数据中心",
  "Renewable energy equipment": "可再生能源设备",
  "Electrical equipment": "电气设备",
  "Battery systems": "电池与储能系统",
  "Electronic components": "电子元件",
  "Industrial automation": "工业自动化",
  Pharmaceuticals: "制药",
  "Medical devices": "医疗器械",
  Biotechnology: "生物技术",
  "Laboratory equipment": "实验室设备",
  "Industrial machinery": "工业机械",
  "Metal fabrication": "金属加工",
  "Advanced materials": "先进材料",
  "Industrial components": "工业零部件",
  "Construction technology": "建筑技术",
  Textiles: "纺织",
  Garments: "服装",
  Footwear: "鞋类",
  Packaging: "包装",
  "Smart electronics": "智能电子",
  Beverages: "饮料",
  "Cold-chain logistics": "冷链物流",
  Furniture: "家具",
  "Engineered wood": "工程木材",
  "Agricultural machinery": "农业机械",
  "Seafood processing": "水产品加工",
  "Cold storage": "冷库",
  "Marine logistics": "海运物流",
  Robotics: "工业机器人",
  "Consumer electronics": "消费电子",
  "Aerospace components": "航空航天零部件",
  "Engineered rubber": "工程橡胶",
  Warehousing: "仓储",
  "Solar equipment": "太阳能设备",
  "Agricultural processing": "农产品加工",
  "Port logistics": "港口物流",
  "Offshore energy equipment": "海上能源设备",
  "Steel fabrication": "钢结构加工",
  "Rice processing": "稻米加工",
  "Food biotechnology": "食品生物技术",
  Biomaterials: "生物材料",
  "Biomass energy": "生物质能源",
  "Sustainable packaging": "可持续包装",
  "Aquaculture processing": "水产养殖加工",
  "Animal feed": "动物饲料",
  "Export logistics": "出口物流",
  "Supply chain": "供应链",
};
const industryLabel = (value: string, language: Language) =>
  language === "vi"
    ? industryVi[value] || value
    : language === "zh"
      ? industryZh[value] || value
      : value;
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
  matching: tx("Đang ghép nối", "Matching"),
  connection_scheduled: tx("Đã hẹn kết nối", "Connection scheduled"),
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
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty">
      <Database size={34} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
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
  value,
  compact = false,
}: {
  value: SourcedValue<unknown>;
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
              ? `${ui(language, "Cập nhật", "As of")} ${value.asOf}`
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
  const { language, role } = useApp();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const nav = [
    [
      "/industrial-parks",
      ui(language, "Khu công nghiệp", "Industrial parks"),
    ],
    ["/assets", ui(language, "BĐS công nghiệp", "Assets")],
    ["/find-supply", ui(language, "Tìm mặt bằng", "Find supply")],
    ["/find-demand", ui(language, "Tìm khách thuê/mua", "Find demand")],
    ["/industrial-expo", ui(language, "Triển lãm công nghiệp", "Industrial Expo")],
  ];
  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/home" className="brand">
          <span className="brand-mark">VIG</span>
          <span>
            <b>Vietnam Industrial Gateway</b>
            <small>
              {ui(language, "Hạ tầng số công nghiệp Việt Nam", "Vietnam industrial digital infrastructure")}
            </small>
          </span>
        </Link>
        <button
          className="mobile-menu"
          aria-label={
            open
              ? ui(language, "Đóng trình đơn", "Close menu")
              : ui(language, "Mở trình đơn", "Open menu")
          }
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
        <nav className={open ? "nav open" : "nav"}>
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
        <div className="header-actions">
          <LanguageToggle />
          {role === "admin" ? (
            <Link className="admin-chip" to="/admin/dashboard">
              <ShieldCheck size={16} /> {ui(language, "Quản trị", "Admin")}
            </Link>
          ) : (
            <Link className="login-link" to="/login">
              <LogIn size={16} />
              {ui(language, "Quản trị", "Admin")}
            </Link>
          )}
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
            <span className="brand-mark">VIG</span>
            <span>
              <b>Vietnam Industrial Gateway</b>
            </span>
          </div>
          <p>
            {ui(language, "Kết nối năng lực công nghiệp Việt Nam với nhu cầu đầu tư và sản xuất toàn cầu.", "Connecting Vietnam’s industrial capacity with global investment and manufacturing demand.")}
          </p>
        </div>
        <div>
          <b>{ui(language, "Khám phá", "Discover")}</b>
          <Link to="/industrial-parks">
            {ui(language, "Khu công nghiệp", "Industrial Parks")}
          </Link>
          <Link to="/assets">
            {ui(language, "Bất động sản công nghiệp", "Industrial Assets")}
          </Link>
          <Link to="/industrial-expo">
            {ui(language, "Triển lãm công nghiệp", "Industrial Expo")}
          </Link>
        </div>
        <div>
          <b>{ui(language, "Kết nối", "Connect")}</b>
          <Link to="/find-supply">
            {ui(language, "Tìm mặt bằng", "Find Supply")}
          </Link>
          <Link to="/find-demand">
            {ui(language, "Tìm khách thuê/mua", "Find Demand")}
          </Link>
          <span>
            {ui(language, "Ghép nối chuyên sâu", "Premium Matching")}
          </span>
        </div>
        <div className="arobid-partner">
          <span className="arobid-platform-badge">
            <CheckCircle2 /> Vietnam Industrial Gateway
          </span>
          <div className="arobid-powered-row">
            <span>
              {ui(language, "Được phát triển bởi", "Powered by")}
            </span>
            <span className="arobid-logo-wrap">
              <img
                src="https://hcminvhub1-2.vercel.app/figma-homepage/arobid-logo.svg"
                alt="arobid.com - A Road to Big Deals"
              />
            </span>
          </div>
        </div>
      </div>
      <div className="copyright">
        <span>© 2026 Vietnam Industrial Gateway · Interactive demo</span>
      </div>
    </footer>
  );
}
function FloatingParkChat() {
  const {
    language,
    parks,
    chatParkId,
    chatOpen,
    chatThreads,
    openParkChat,
    closeParkChat,
    toggleParkChat,
    sendParkChatMessage,
  } = useApp();
  const [draft, setDraft] = useState("");
  const activePark = parks.find((park) => park.id === chatParkId) || null;
  const threadIds = Object.keys(chatThreads);
  return (
    <div className="floating-chat-root">
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
                    <span>{park.logoText.slice(0, 3)}</span>
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
                <span>{activePark.logoText.slice(0, 3)}</span>
                <div>
                  <b>{tr(activePark.name, language)}</b>
                  <small><i /> {ui(language, "Đơn vị cung cấp · Trực tuyến", "Supplier · Online")}</small>
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
                </div>
              ))}
            </div>
            <form
              className="floating-chat-composer"
              onSubmit={(event) => {
                event.preventDefault();
                if (!draft.trim()) return;
                sendParkChatMessage(draft);
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
        className={`floating-chat-launcher ${chatOpen ? "open" : ""}`}
        onClick={toggleParkChat}
        aria-label={ui(language, "Mở trao đổi với khu công nghiệp", "Open industrial park chat")}
      >
        {chatOpen ? <X /> : <MessageCircle />}
        {threadIds.length > 0 && <span>{threadIds.length}</span>}
      </button>
    </div>
  );
}
function PublicShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
      <FloatingParkChat />
    </>
  );
}

function HomePage() {
  const { language, parks, assets, requests } = useApp();
  const navigate = useNavigate();
  const featured = parks.slice(0, 4);
  const completedConnections = requests.filter(
    (request) => request.status === "closed",
  ).length;
  return (
    <PublicShell>
      <section className="hero">
        <img
          src="/images/vig-industrial-hero.png"
          alt={
            ui(language, "Toàn cảnh khu công nghiệp và cảng biển", "Industrial park and seaport panorama")
          }
        />
        <div className="hero-overlay" />
        <div className="hero-content">
          <span className="hero-kicker">
            <Sparkles size={16} />
            {ui(language, "Dữ liệu chuẩn hóa · Kết nối đầu tư", "Data-powered · Intelligently connected")}
          </span>
          <h1
            className={
              language === "vi"
                ? "hero-title-vi"
                : language === "zh"
                  ? "hero-title-zh"
                  : undefined
            }
          >
            {language === "vi" ? (
              <>
                <span>HẠ TẦNG XÚC TIẾN</span>
                <span>ĐẦU TƯ CÔNG NGHIỆP</span>
                <span>VIỆT NAM</span>
              </>
            ) : language === "zh" ? (
              "越南工业投资促进平台"
            ) : (
              "VIETNAM INDUSTRIAL DIGITAL INFRASTRUCTURE"
            )}
          </h1>
          <p>
            {ui(language, "Vận hành dựa trên dữ liệu, ghép nối giao dịch bởi AI", "Powered by data and matched by AI")}
          </p>
          <div className="hero-actions">
            <Link className="button gold" to="/industrial-parks">
              {ui(language, "Tra cứu khu công nghiệp", "Explore supply")}
              <ArrowRight size={18} />
            </Link>
            <Link className="button ghost" to="/find-supply">
              {ui(language, "Gửi yêu cầu tìm mặt bằng", "Submit requirement")}
            </Link>
          </div>
          <div className="hero-stats">
            <div>
              <b>20</b>
              <span>
                {ui(language, "hồ sơ khu công nghiệp", "park profiles")}
              </span>
            </div>
            <div>
              <b>{assets.length}</b>
              <span>
                {ui(language, "BĐS công nghiệp mẫu", "demo assets")}
              </span>
            </div>
            <div>
              <b>{completedConnections}</b>
              <span>
                {ui(language, "kết nối thành công", "completed connections")}
              </span>
            </div>
          </div>
        </div>
      </section>
      <section className="search-band">
        <div>
          <Search />
          <input
            aria-label="Industrial search"
            placeholder={
              ui(language, "Tìm KCN, tỉnh, ngành hoặc loại tài sản...", "Search park, province, industry or asset type...")
            }
          />
        </div>
        <button onClick={() => navigate("/industrial-parks")}>
          {ui(language, "Tìm kiếm", "Search")}
        </button>
      </section>
      <section className="page section">
        <SectionTitle
          eyebrow={ui(language, "LỚP DỮ LIỆU CÔNG NGHIỆP", "INDUSTRIAL DATA LAYER")}
          title={
            ui(language, "Hồ sơ khu công nghiệp nổi bật", "Featured industrial park profiles")
          }
          description={
            ui(language, "Dữ liệu được chuẩn hóa, có nguồn, đơn vị và thời điểm xác minh.", "Standardised data with sources, units and verification dates.")
          }
        />
        <div className="park-grid">
          {featured.map((p) => (
            <ParkCard key={p.id} park={p} />
          ))}
        </div>
        <div className="center">
          <Link className="text-link" to="/industrial-parks">
            {ui(language, "Xem tất cả 20 hồ sơ", "View all 20 profiles")}
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>
      <section className="dark-section">
        <div className="page">
          <SectionTitle
            eyebrow={ui(language, "KẾT NỐI HAI CHIỀU", "TWO-WAY REQUEST")}
            title={
              ui(language, "Kết nối nhu cầu thuê, mua và chào thuê", "Two connection directions, one gateway")
            }
          />
          <div className="funnel-grid">
            <div className="funnel-card">
              <Warehouse />
              <span>FIND DEMAND</span>
              <h3>
                {ui(language, "Tôi có mặt bằng công nghiệp", "I have supply")}
              </h3>
              <p>
                {ui(language, "Tìm khách thuê hoặc bên nhận chuyển nhượng đất, nhà xưởng và kho.", "Find tenants or buyers for land, factories and warehouses.")}
              </p>
              <Link to="/find-demand">
                {ui(language, "Tìm khách thuê/mua", "Find Demand")}{" "}
                <ArrowRight size={16} />
              </Link>
            </div>
            <div className="funnel-card featured">
              <PackageSearch />
              <span>FIND SUPPLY</span>
              <h3>
                {ui(language, "Tôi cần tìm mặt bằng", "I need supply")}
              </h3>
              <p>
                {ui(language, "Tìm khu công nghiệp, quỹ đất, nhà xưởng hoặc kho phù hợp với dự án.", "Find the right park, land, factory or warehouse.")}
              </p>
              <Link to="/find-supply">
                {ui(language, "Tìm mặt bằng phù hợp", "Find Supply")}{" "}
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>
      <section className="page section">
        <SectionTitle
          eyebrow={ui(language, "QUY TRÌNH VIG", "HOW VIG WORKS")}
          title={
            ui(language, "Từ yêu cầu đầu tư đến kết nối dự án", "From requirement to opportunity")
          }
        />
        <div className="steps">
          {[
            [Search, ui(language, "Tra cứu", "Search")],
            [FileText, ui(language, "Gửi yêu cầu", "Request")],
            [Sparkles, ui(language, "Đề xuất", "Matching")],
            [Handshake, ui(language, "Kết nối", "Connect")],
            [Users, ui(language, "Trao đổi", "Meeting")],
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
      <section className="page section expo-banner">
        <div>
          <span>{ui(language, "TRIỂN LÃM CÔNG NGHIỆP SỐ", "DIGITAL INDUSTRIAL EXPO")}</span>
          <h2>
            {ui(language, "Mở rộng tiếp cận thị trường toàn cầu", "Expand global market reach")}
          </h2>
          <p>{ui(language, "Trung Quốc · Hàn Quốc · Nhật Bản · Singapore · Toàn cầu–Việt Nam", "China · Korea · Japan · Singapore · Global–Vietnam")}</p>
          <Link className="button gold" to="/industrial-expo">
            {ui(language, "Khám phá Expo", "Explore Expo")}
          </Link>
        </div>
        <Globe2 size={150} />
      </section>
    </PublicShell>
  );
}

function ParkCard({ park }: { park: IndustrialParkProfile }) {
  const { language } = useApp();
  const available = park.availability[0]?.available;
  return (
    <article className="park-card">
      <Link to={`/industrial-parks/${park.slug}`} className="park-image">
        <img src={park.media[0]?.url} alt={tr(park.name, language)} />
        <span className="demo-label">
          {park.id.includes("demo")
            ? ui(language, "DỮ LIỆU MINH HỌA", "DEMO DATA")
            : ui(language, "HỒ SƠ THAM CHIẾU", "REFERENCE PROFILE")}
        </span>
      </Link>
      <div className="park-body">
        <div className="park-meta">
          <Badge value={park.status} tone="green" />
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
            {available ? <SourceValue value={available} compact /> : "—"}
          </div>
        </div>
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
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("all");
  const [status, setStatus] = useState("all");
  const [industry, setIndustry] = useState("all");
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
  const filtered = parks.filter(
    (p) =>
      (!q ||
        `${tr(p.name, language)} ${p.province} ${p.suitableIndustries}`
          .toLowerCase()
          .includes(q.toLowerCase())) &&
      (region === "all" || p.region === region) &&
      (industry === "all" || p.suitableIndustries.includes(industry)) &&
      (status === "all" || p.status === status),
  );
  return (
    <PublicShell>
      <div className="page page-top">
        <div className="page-heading">
          <span>{ui(language, "LỚP DỮ LIỆU CÔNG NGHIỆP", "INDUSTRIAL DATA LAYER")}</span>
          <h1>
            {ui(language, "Danh mục khu công nghiệp", "Industrial park directory")}
          </h1>
          <p>
            {ui(language, "Tra cứu vị trí, quỹ đất, hạ tầng kỹ thuật, khả năng kết nối và hồ sơ pháp lý của từng khu công nghiệp.", "Explore industrial supply through standardised, source-aware profiles.")}
          </p>
        </div>
        <div className="filter-panel">
          <label>
            <Search size={17} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={
                ui(language, "Tìm theo tên khu công nghiệp, tỉnh/thành hoặc ngành nghề...", "Search name, province, industry...")
              }
            />
          </label>
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
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
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
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
        </div>
        <div className="result-bar">
          <b>
            {filtered.length}{" "}
            {ui(language, "khu công nghiệp", "industrial parks")}
          </b>
          <span>
            <ShieldCheck size={16} />
            {ui(language, "Dữ liệu có nguồn đối chiếu", "Source-aware fields")}
          </span>
        </div>
        {filtered.length ? (
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
function ContactModal({
  type,
  park,
  close,
}: {
  type: string;
  park: IndustrialParkProfile;
  close: () => void;
}) {
  const { language } = useApp();
  const [sent, setSent] = useState(false);
  const modalTitle: Record<string, LocalizedText> = {
    Inquiry: tx("Yêu cầu tư vấn", "Inquiry"),
    Meeting: tx("Yêu cầu cuộc hẹn", "Meeting request"),
  };
  if (sent)
    return (
      <Modal
        title={ui(language, "Đã ghi nhận", "Request recorded")}
        close={close}
      >
        <div className="success-state">
          <CheckCircle2 />
          <h3>
            {ui(language, "VIG đã tiếp nhận yêu cầu", "VIG received your request")}
          </h3>
          <p>
            {ui(language, "Yêu cầu đã được ghi nhận trong phiên bản demo. Bộ phận quản trị VIG sẽ tiếp tục xử lý ở bước tiếp theo.", "This is a simulation. VIG Admin would be notified to coordinate the next step.")}
          </p>
          <button className="button primary" onClick={close}>
            {ui(language, "Hoàn tất", "Done")}
          </button>
        </div>
      </Modal>
    );
  return (
    <Modal
      title={`${tr(modalTitle[type] || tx(type, type), language)} · ${tr(park.name, language)}`}
      close={close}
    >
      <form
        className="modal-form"
        onSubmit={(e) => {
          e.preventDefault();
          setSent(true);
        }}
      >
        <label>
          {ui(language, "Họ tên", "Name")}
          <input required />
        </label>
        <label>
          Email
          <input type="email" required />
        </label>
        <label>
          {ui(language, "Nội dung", "Message")}
          <textarea
            defaultValue={
              language === "vi"
                ? `Tôi muốn tìm hiểu thêm về ${tr(park.name, language)}.`
                : `I would like to know more about ${tr(park.name, language)}.`
            }
          />
        </label>
        <button className="button primary">
          <Send size={16} />
          {ui(language, "Gửi yêu cầu", "Send demo request")}
        </button>
      </form>
    </Modal>
  );
}

function ParkDetailPage() {
  const { slug } = useParams();
  const { language, parks, assets, openParkChat } = useApp();
  const [modal, setModal] = useState("");
  const [activeParkTab, setActiveParkTab] = useState<"information" | "assets">(
    "information",
  );
  const [activeSection, setActiveSection] = useState("overview");
  const park = parks.find((p) => p.slug === slug);
  if (!park)
    return (
      <PublicShell>
        <div className="page page-top">
          <Empty
            title={
              ui(language, "Không tìm thấy hồ sơ", "Profile not found")
            }
            text={
              ui(language, "Hồ sơ khu công nghiệp này không tồn tại.", "This industrial park profile does not exist.")
            }
          />
        </div>
      </PublicShell>
    );
  const linked = assets.filter((a) => a.parkId === park.id);
  const publicDocs = park.documents;
  const scrollToSection = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };
  const sectionNavItems = [
    ["overview", ui(language, "Tổng quan", "Overview")],
    ["connectivity", ui(language, "Kết nối", "Connectivity")],
    ["infrastructure", ui(language, "Hạ tầng", "Infrastructure")],
    ["workforce", ui(language, "Nhân lực", "Workforce")],
    ["incentives", ui(language, "Ưu đãi", "Incentives")],
    ["media", ui(language, "Hình ảnh", "Media")],
    ["documents", ui(language, "Tài liệu", "Documents")],
  ];
  return (
    <PublicShell>
      <div className="detail-hero">
        <img src={park.media[0]?.url} alt={tr(park.name, language)} />
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
            <Badge value={park.status} tone="green" />
            <span className="verified">
              <ShieldCheck size={15} />
              {ui(language, "Hồ sơ đã xác minh", "Verified profile")}
            </span>
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
                  ui(language, "Yêu cầu cuộc hẹn", "Request meeting"),
                )
              }
            >
              <Users size={17} />
              {ui(language, "Đặt lịch kết nối", "Request meeting")}
            </button>
          </div>
        </div>
      </div>
      <nav className="park-primary-tabs" aria-label={ui(language, "Nội dung hồ sơ", "Profile content")}>
        <div className="page">
          <button
            type="button"
            className={activeParkTab === "information" ? "active" : ""}
            onClick={() => setActiveParkTab("information")}
          >
            <FileText /> {ui(language, "Thông tin", "Information")}
          </button>
          <button
            type="button"
            className={activeParkTab === "assets" ? "active" : ""}
            onClick={() => setActiveParkTab("assets")}
          >
            <PackageSearch /> {ui(language, "Tài sản", "Assets")}
            <span>{linked.length}</span>
          </button>
        </div>
      </nav>
      <div className={`page detail-page ${activeParkTab}`}>
        <aside className="park-section-nav">
          <b>{ui(language, "Nội dung hồ sơ", "Profile sections")}</b>
          {sectionNavItems.map(([id, label], index) => (
            <button
              type="button"
              className={activeSection === id ? "active" : ""}
              onClick={() => scrollToSection(id)}
              key={id}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {label}
            </button>
          ))}
        </aside>
        <section className="key-facts">
          <div>
            <span>{ui(language, "Tổng diện tích", "Total area")}</span>
            <SourceValue value={park.totalArea} />
          </div>
          <div>
            <span>
              {ui(language, "Đất công nghiệp", "Industrial land")}
            </span>
            <SourceValue value={park.industrialLandArea} />
          </div>
          <div>
            <span>
              {ui(language, "Diện tích sẵn sàng", "Available area")}
            </span>
            <SourceValue value={park.availability[0].available} />
          </div>
          <div>
            <span>{ui(language, "Lô tối thiểu", "Minimum plot")}</span>
            {park.availability[0].minimumPlot ? (
              <SourceValue value={park.availability[0].minimumPlot} />
            ) : (
              <b>—</b>
            )}
          </div>
        </section>
        <section id="overview" className="detail-grid">
          <div className="content-card wide">
            <SectionTitle
              eyebrow="01 · PROFILE"
              title={
                ui(language, "Tổng quan khu công nghiệp", "Industrial park overview")
              }
            />
            <p className="lead">{tr(park.summary, language)}</p>
            <div className="info-grid">
              <div>
                <small>{ui(language, "Loại hình", "Park type")}</small>
                <b>{tr(park.parkType, language)}</b>
              </div>
              <div>
                <small>
                  {ui(language, "Khu kinh tế", "Economic zone")}
                </small>
                <b>{tr(park.economicZone, language)}</b>
              </div>
              <div>
                <small>
                  {ui(language, "Năm thành lập", "Established")}
                </small>
                <b>{park.establishmentYear}</b>
              </div>
              <div>
                <small>{ui(language, "Giai đoạn", "Phase")}</small>
                <b>{tr(park.phases[0].name, language)}</b>
              </div>
            </div>
          </div>
          <aside className="content-card operator-card">
            <span>{park.logoText}</span>
            <h3>{park.operator.name}</h3>
            <p>{tr(park.operator.overview, language)}</p>
            <a href={park.operator.website} target="_blank">
              {ui(language, "Website đơn vị phát triển", "Developer website")}
              <ExternalLink size={14} />
            </a>
          </aside>
        </section>
        <section className="profile-stats">
          <SectionTitle
            eyebrow="OPERATOR TRACK RECORD"
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
        </section>
        <section id="connectivity">
          <SectionTitle
            eyebrow="02 · LOCATION"
            title={
              ui(language, "Vị trí và kết nối chiến lược", "Location and strategic connectivity")
            }
          />
          <div className="connect-grid">
            <div className="map-panel">
              <div className="map-rings">
                <span className="map-point park">VIG</span>
                <span className="map-point port">
                  <Ship /> Port
                </span>
                <span className="map-point airport">
                  <Plane /> Airport
                </span>
                <span className="map-point city">Hanoi</span>
                <i />
                <i />
                <i />
              </div>
              <div className="coordinates">
                <MapPin size={16} />
                {park.coordinates?.lat.toFixed(4)},{" "}
                {park.coordinates?.lng.toFixed(4)}
              </div>
            </div>
            <div className="connect-list">
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
        </section>
        <section>
          <SectionTitle
            eyebrow="03 · MASTERPLAN"
            title={
              ui(language, "Quy hoạch mặt bằng và hiện trạng quỹ đất", "Masterplan and land availability")
            }
          />
          <div className="masterplan-card">
            <div className="masterplan">
              <span className="zone available">A1</span>
              <span className="zone occupied">B1</span>
              <span className="zone reserved">C1</span>
              <span className="zone future">D1</span>
              <span className="zone utility">
                <Zap />U
              </span>
              <div className="road horizontal" />
              <div className="road vertical" />
            </div>
            <div className="legend">
              <b>{ui(language, "Chú giải", "Legend")}</b>
              <span>
                <i className="available" />
                {ui(language, "Sẵn sàng bàn giao", "Available")}
              </span>
              <span>
                <i className="reserved" />
                {ui(language, "Đã giữ chỗ", "Reserved")}
              </span>
              <span>
                <i className="occupied" />
                {ui(language, "Đã lấp đầy", "Occupied")}
              </span>
              <span>
                <i className="utility" />
                {ui(language, "Hạ tầng kỹ thuật", "Utility")}
              </span>
              <span>
                <i className="future" />
                {ui(language, "Khu mở rộng", "Future")}
              </span>
              <small>
                {ui(language, "Sơ đồ quy hoạch minh họa trong phiên bản demo", "Interactive schematic for demonstration")}
              </small>
            </div>
          </div>
        </section>
        <section id="infrastructure">
          <SectionTitle
            eyebrow="04 · INFRASTRUCTURE"
            title={
              ui(language, "Hạ tầng và tiện ích đồng bộ", "Integrated infrastructure and utilities")
            }
          />
          <div className="utility-grid">
            {park.utilities.map((u, i) => {
              const UtilityIcon = [
                Zap,
                Warehouse,
                Activity,
                Globe2,
                ShieldCheck,
                Factory,
              ][i % 6];
              return (
                <article key={u.key}>
                  <UtilityIcon size={25} />
                  <span>{tr(u.label, language)}</span>
                  <SourceValue value={u.capacity} />
                </article>
              );
            })}
          </div>
          <div className="pill-list">
            {park.amenities.map((x) => (
              <span key={x.en}>
                <Check />
                {tr(x, language)}
              </span>
            ))}
          </div>
        </section>
        <section id="workforce" className="detail-grid">
          <div className="content-card wide">
            <SectionTitle
              eyebrow="05 · PROVINCIAL CONTEXT"
              title={
                ui(language, "Kinh tế địa phương và nguồn nhân lực", "Provincial economy and workforce")
              }
            />
            <div className="metric-grid">
              <div>
                <small>{ui(language, "Dân số", "Population")}</small>
                <SourceValue value={park.provinceProfile.population} />
              </div>
              <div>
                <small>GRDP</small>
                <SourceValue value={park.provinceProfile.grdp} />
              </div>
              <div>
                <small>
                  {ui(language, "Tốc độ tăng trưởng", "Growth")}
                </small>
                <SourceValue value={park.provinceProfile.growthRate} />
              </div>
              <div>
                <small>
                  {ui(language, "Lực lượng lao động", "Labour force")}
                </small>
                <SourceValue value={park.workforce.laborForce} />
              </div>
              <div>
                <small>
                  {ui(language, "Lao động qua đào tạo", "Skilled labour")}
                </small>
                <SourceValue value={park.workforce.skilledLabor} />
              </div>
              <div>
                <small>
                  {ui(language, "Nguồn lao động trong bán kính 20 km", "20 km catchment")}
                </small>
                <SourceValue value={park.workforce.catchmentPopulation} />
              </div>
            </div>
            <p>{tr(park.provinceProfile.context, language)}</p>
          </div>
          <aside className="content-card">
            <h3>
              {ui(language, "Mức lương tham khảo", "Salary benchmark")}
            </h3>
            {park.workforce.salaryBenchmark.length ? (
              park.workforce.salaryBenchmark.map((x) => (
                <div className="salary" key={x.role.en}>
                  <span>{tr(x.role, language)}</span>
                  <b>{x.rangeUsd}</b>
                </div>
              ))
            ) : (
              <p>{ui(language, "Chưa có dữ liệu", "Not available")}</p>
            )}
          </aside>
        </section>
        <section id="incentives">
          <SectionTitle
            eyebrow="06 · INCENTIVES"
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
                    {x.effectiveDate} · Source: {x.sourceDocumentId}
                  </small>
                </div>
                <div className="tax-timeline">
                  {x.schedule.map((s, i) => (
                    <article key={i}>
                      <b>{s.rate}</b>
                      <span>{tr(s.label, language)}</span>
                      <small>{s.years}</small>
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
        </section>
        <section className="park-assets-panel">
          <SectionTitle
            eyebrow="07 · AVAILABILITY"
            title={
              ui(language, "Quỹ đất và nhà xưởng đang chào thuê", "Available land and industrial assets")
            }
          />
          {linked.length ? (
            <div className="asset-grid">
              {linked.map((a) => (
                <AssetCard key={a.id} asset={a} />
              ))}
            </div>
          ) : (
            <Empty
              title={
                ui(language, "Chưa có sản phẩm được công bố", "No published assets")
              }
              text={
                ui(language, "Liên hệ VIG để được hỗ trợ tìm mặt bằng phù hợp.", "Contact VIG for supply sourcing support.")
              }
            />
          )}
        </section>
        <section>
          <SectionTitle
            eyebrow="08 · INVESTMENT PROCESS"
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
        </section>
        <section className="detail-grid">
          <div className="content-card wide">
            <SectionTitle
              eyebrow="09 · LOGISTICS"
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
                  <span>{r.time}</span>
                  <small>{r.frequency}</small>
                </div>
              ))}
            </div>
          </div>
          <aside className="content-card">
            <h3>
              {ui(language, "Chi phí vận chuyển tham khảo", "Indicative costs")}
            </h3>
            {park.logistics.indicativeCosts.map((c) => (
              <div className="salary" key={c.container}>
                <span>Container {c.container}</span>
                <SourceValue value={c.usd} compact />
              </div>
            ))}
            <small>
              {ui(language, "Chi phí mang tính tham khảo tại thời điểm của tài liệu nguồn.", "Indicative only, based on the source profile.")}
            </small>
          </aside>
        </section>
        <section className="triple">
          <div className="content-card">
            <h3>
              {ui(language, "Ngành phù hợp", "Suitable industries")}
            </h3>
            <div className="pill-list">
              {park.suitableIndustries.map((x) => (
                <span key={x}>
                  <Check /> {industryLabel(x, language)}
                </span>
              ))}
            </div>
          </div>
          <div className="content-card">
            <h3>
              {ui(language, "Phát triển bền vững", "Sustainability")}
            </h3>
            {park.sustainability.map((x) => (
              <p className="checkline" key={x.en}>
                <Check />
                {tr(x, language)}
              </p>
            ))}
          </div>
          <div className="content-card">
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
          </div>
        </section>
        {park.media.length ? (
          <section id="media">
            <SectionTitle
              eyebrow="10 · MEDIA"
              title={
                ui(language, "Hình ảnh và mặt bằng khu công nghiệp", "Industrial park media and masterplan")
              }
            />
            <div className="media-gallery">
              {park.media
                .filter((item) => item.approved)
                .map((item) => (
                  <figure key={item.id}>
                    <img src={item.url} alt={tr(item.title, language)} />
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
            {park.id.includes("demo") ? (
              <p className="media-disclaimer">
                {ui(language, "Hình ảnh được tạo cho mục đích mô phỏng giao diện và không phản ánh một dự án thực tế.", "Images were created for interface demonstration and do not depict a real project.")}
              </p>
            ) : null}
          </section>
        ) : null}
        <section id="documents">
          <SectionTitle
            eyebrow="11 · DOCUMENTS"
            title={
              ui(language, "Hồ sơ pháp lý và tài liệu dự án", "Legal evidence and verification")
            }
          />
          <div className="doc-list">
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
                    {d.issueDate ? `· ${d.issueDate}` : ""} ·{" "}
                    {d.language.toUpperCase()}
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
                {d.visibility === "admin_only" ? (
                  <button disabled>
                    <Lock size={15} />
                    {ui(language, "Chỉ quản trị viên", "Admin only")}
                  </button>
                ) : (
                  <a href={d.sourceUrl} target="_blank" rel="noreferrer">
                    <Download size={15} />
                    {ui(language, "Xem tài liệu", "View source")}
                  </a>
                )}
              </article>
            ))}
          </div>
        </section>
        <section className="contact-card">
          <div>
            <span>{ui(language, "LIÊN HỆ VIG", "CONTACT VIG")}</span>
            <h2>
              {ui(language, "Quan tâm đến cơ hội đầu tư tại khu công nghiệp này?", "Ready to explore this opportunity?")}
            </h2>
            <p>
              {park.contact
                ? `${tr(park.contact.office, language)} · ${park.contact.email}`
                : ""}
            </p>
          </div>
          <div>
            <button
              className="button primary"
              onClick={() => setModal("Inquiry")}
            >
              <Send size={17} />
              {ui(language, "Gửi yêu cầu tư vấn", "Send inquiry")}
            </button>
            <Link className="button outline" to="/find-supply">
              <PackageSearch size={17} />
              {ui(language, "Tìm mặt bằng tương tự", "Find Supply")}
            </Link>
          </div>
        </section>
      </div>
      {modal && (
        <ContactModal type={modal} park={park} close={() => setModal("")} />
      )}
    </PublicShell>
  );
}

function AssetCard({
  asset,
}: {
  asset: ReturnType<typeof useApp>["assets"][number];
}) {
  const { language, parks, openParkChat } = useApp();
  const navigate = useNavigate();
  const park = parks.find((p) => p.id === asset.parkId);
  const requestUrl = `/find-supply?${new URLSearchParams({
    parkId: asset.parkId,
    assetId: asset.id,
  }).toString()}`;
  return (
      <article
        className="asset-card"
        role="link"
        tabIndex={0}
        onClick={() => navigate(`/assets/${asset.id}`)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") navigate(`/assets/${asset.id}`);
        }}
      >
        <div className="asset-card-image">
          <img src={asset.image} alt={tr(asset.name, language)} />
        </div>
        <div className="asset-card-body">
          <Badge value={asset.type} tone="blue" />
          <h3>{tr(asset.name, language)}</h3>
          <p>
            <MapPin size={14} />
            {park ? tr(park.name, language) : ""}
          </p>
          <div className="asset-card-facts">
            <b>
              {asset.area.toLocaleString()} {asset.unit}
            </b>
            <SourceValue value={asset.price} compact />
          </div>
          <div className="asset-card-actions">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                if (park) openParkChat(park.id);
              }}
              disabled={!park}
            >
              <MessageCircle /> {ui(language, "Trao đổi", "Chat")}
            </button>
            <Link to={requestUrl} onClick={(event) => event.stopPropagation()}>
              <Send /> Direct Request
            </Link>
          </div>
        </div>
      </article>
  );
}
function AssetsPage() {
  const { language, assets } = useApp();
  const [type, setType] = useState("all");
  const filtered = assets.filter((a) => type === "all" || a.type === type);
  const assetTypeFilters = [
    { value: "all", icon: PackageSearch, vi: "Tất cả loại hình", en: "All assets" },
    { value: "industrial_land", icon: Map, vi: "Đất công nghiệp", en: "Industrial land" },
    { value: "ready_built_factory", icon: Factory, vi: "Nhà xưởng xây sẵn", en: "Ready-built factory" },
    { value: "warehouse", icon: Warehouse, vi: "Kho vận", en: "Warehouse" },
    { value: "build_to_suit", icon: HardHat, vi: "Xây theo yêu cầu", en: "Build-to-suit" },
  ];
  return (
    <PublicShell>
      <div className="page page-top">
        <div className="page-heading">
          <span>{ui(language, "BẤT ĐỘNG SẢN CÔNG NGHIỆP", "INDUSTRIAL ASSETS")}</span>
          <h1>
            {ui(language, "Bất động sản công nghiệp", "Industrial supply")}
          </h1>
          <p>
            {ui(language, "Quỹ đất công nghiệp, nhà xưởng xây sẵn, kho vận và giải pháp xây theo yêu cầu.", "Land, factories, warehouses and build-to-suit solutions.")}
          </p>
        </div>
        <div
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
        <div className="asset-result-bar">
          <b>
            {filtered.length} {ui(language, "bất động sản công nghiệp", "industrial assets")}
          </b>
          <span>{ui(language, "Dữ liệu minh họa", "Demo inventory")}</span>
        </div>
        {filtered.length ? (
          <div className="asset-grid">
            {filtered.map((a) => (
              <AssetCard key={a.id} asset={a} />
            ))}
          </div>
        ) : (
          <Empty
            title={ui(language, "Chưa có tài sản phù hợp", "No matching assets")}
            text={ui(language, "Vui lòng chọn loại hình khác hoặc gửi yêu cầu tìm mặt bằng.", "Choose another asset type or submit a supply request.")}
          />
        )}
      </div>
    </PublicShell>
  );
}
function AssetDetailPage() {
  const { id } = useParams();
  const { assets, parks, language, openParkChat } = useApp();
  const asset = assets.find((a) => a.id === id);
  if (!asset) return <Navigate to="/assets" />;
  const park = parks.find((p) => p.id === asset.parkId)!;
  const requestUrl = `/find-supply?${new URLSearchParams({ parkId: park.id, assetId: asset.id }).toString()}`;
  return (
    <PublicShell>
      <div className="page page-top">
        <div className="breadcrumbs">
          <Link to="/assets">
            {ui(language, "Bất động sản công nghiệp", "Assets")}
          </Link>
          <ChevronRight size={14} />
          <span>{tr(asset.name, language)}</span>
        </div>
        <div className="asset-detail">
          <img src={asset.image} alt={tr(asset.name, language)} />
          <div>
            <Badge value={asset.type} />
            <h1>{tr(asset.name, language)}</h1>
            <p>
              <MapPin size={16} />
              <Link to={`/industrial-parks/${park.slug}`}>
                {tr(park.name, language)}
              </Link>
            </p>
            <p>{tr(asset.description, language)}</p>
            <div className="key-facts stacked">
              <div>
                <span>
                  {ui(language, "Diện tích chào thuê", "Area")}
                </span>
                <b>
                  {asset.area.toLocaleString()} {asset.unit}
                </b>
              </div>
              <div>
                <span>{ui(language, "Đơn giá tham khảo", "Price")}</span>
                <SourceValue value={asset.price} />
              </div>
              <div>
                <span>
                  {ui(language, "Thời điểm bàn giao", "Available from")}
                </span>
                <b>{asset.availableFrom}</b>
              </div>
              <div>
                <span>{ui(language, "Công suất điện", "Power")}</span>
                <b>{asset.powerMva} MVA</b>
              </div>
            </div>
            <div className="asset-detail-actions">
              <button className="button outline" type="button" onClick={() => openParkChat(park.id)}>
                <MessageCircle /> {ui(language, "Trao đổi với KCN", "Chat with park")}
              </button>
              <Link className="button primary" to={requestUrl}>
                <Send /> {ui(language, "Gửi yêu cầu tư vấn", "Send requirement")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}

const emptyForm = {
  organization: "",
  contactName: "",
  email: "",
  phone: "",
  service: "Premium Matching",
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
  const { language, createRequest, parks, assets } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedAsset = assets.find((asset) => asset.id === searchParams.get("assetId"));
  const selectedPark = parks.find(
    (park) => park.id === (searchParams.get("parkId") || selectedAsset?.parkId),
  );
  const [form, setForm] = useState(() => ({
    ...emptyForm,
    assetType: selectedAsset
      ? tr(labels[selectedAsset.type], language)
      : "",
    industrialParkName: selectedPark?.name.en || "",
    location: selectedPark?.province || "",
    areaMin: selectedAsset
      ? String(selectedAsset.unit === "ha" ? selectedAsset.area * 10000 : selectedAsset.area)
      : "",
    areaMax: selectedAsset
      ? String(selectedAsset.unit === "ha" ? selectedAsset.area * 10000 : selectedAsset.area)
      : "",
    transaction: selectedAsset?.transaction || "lease",
    industry: selectedAsset?.industries[0] || "",
    availabilityDate: selectedAsset?.availableFrom || "",
    requirements: selectedAsset && selectedPark
      ? language === "vi"
        ? `Tôi quan tâm đến ${tr(selectedAsset.name, language)} tại ${tr(selectedPark.name, language)}.`
        : `I am interested in ${tr(selectedAsset.name, language)} at ${tr(selectedPark.name, language)}.`
      : "",
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isSupply = kind === "find_supply";
  const update = (k: string, v: string) => setForm((x) => ({ ...x, [k]: v }));
  function submit(e: FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
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
      "availabilityDate",
    ].forEach((k) => {
      if (!String(form[k as keyof typeof form]).trim())
        er[k] = ui(language, "Vui lòng nhập thông tin", "Required");
    });
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email))
      er.email =
        ui(language, "Địa chỉ email không hợp lệ", "Invalid email");
    if (
      +form.areaMin <= 0 ||
      +form.areaMax <= 0 ||
      +form.areaMin > +form.areaMax
    )
      er.areaMin =
        ui(language, "Khoảng diện tích không hợp lệ", "Invalid area range");
    if (
      form.availabilityDate &&
      new Date(form.availabilityDate) < new Date(new Date().toDateString())
    )
      er.availabilityDate =
        ui(language, "Thời điểm bàn giao phải từ hôm nay trở đi", "Date must be in the future");
    setErrors(er);
    if (Object.keys(er).length) return;
    const id = createRequest({
      ...form,
      kind,
      areaMin: +form.areaMin,
      areaMax: +form.areaMax,
      transaction: form.transaction as "lease" | "sale",
    });
    navigate(`/request-confirmation/${id}`);
  }
  const field = (key: keyof typeof form, label: string, type = "text") => (
    <label className={errors[key] ? "invalid" : ""}>
      <span>{label} *</span>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => update(key, e.target.value)}
      />
      {errors[key] && <small>{errors[key]}</small>}
    </label>
  );
  return (
    <PublicShell>
      <div className="request-hero">
        <div className="page">
          <span>
            {isSupply
              ? "FIND SUPPLY · TÌM MẶT BẰNG"
              : "FIND DEMAND · TÌM KHÁCH THUÊ/MUA"}
          </span>
          <h1>
            {isSupply
              ? ui(language, "Tìm khu công nghiệp, đất, nhà xưởng hoặc kho phù hợp", "Find an industrial park, land, factory or warehouse")
              : ui(language, "Tìm khách thuê hoặc bên nhận chuyển nhượng phù hợp", "Find the right tenant or buyer")}
          </h1>
          <p>
            {ui(language, "Đội ngũ VIG sẽ tiếp nhận, rà soát nhu cầu và hỗ trợ kết nối với các bên phù hợp.", "VIG Admin will receive, verify and coordinate the connection.")}
          </p>
        </div>
      </div>
      <div className="page request-layout">
        <form className="request-form" onSubmit={submit}>
          <div className="form-section">
            <h2>
              1.{" "}
              {language === "vi"
                ? isSupply
                  ? "Nhu cầu mặt bằng công nghiệp"
                  : "Thông tin mặt bằng chào thuê/chuyển nhượng"
                : "Industrial requirement"}
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
                  onChange={(e) => update("industrialParkName", e.target.value)}
                >
                  <option value="">
                    {ui(language, "Chưa xác định", "Not specified")}
                  </option>
                  {parks.map((park) => (
                    <option key={park.id} value={park.name.en}>
                      {tr(park.name, language)}
                    </option>
                  ))}
                </select>
              </label>
              {field(
                "location",
                language === "vi"
                  ? isSupply
                    ? "Tỉnh/thành hoặc khu vực mong muốn"
                    : "Vị trí tài sản"
                  : "Location",
              )}{" "}
              {field(
                "areaMin",
                ui(language, "Diện tích từ (m²)", "Minimum area"),
                "number",
              )}
              {field(
                "areaMax",
                ui(language, "Diện tích đến (m²)", "Maximum area"),
                "number",
              )}
              <label>
                <span>
                  {ui(language, "Hình thức giao dịch", "Transaction")} *
                </span>
                <select
                  value={form.transaction}
                  onChange={(e) => update("transaction", e.target.value)}
                >
                  <option value="lease">
                    {language === "vi"
                      ? isSupply
                        ? "Thuê"
                        : "Cho thuê"
                      : "Lease"}
                  </option>
                  <option value="sale">
                    {isSupply
                      ? ui(language, "Nhận chuyển nhượng", "Purchase")
                      : ui(language, "Chuyển nhượng", "Sale")}
                  </option>
                </select>
              </label>
              {field(
                "budgetOrPrice",
                isSupply
                  ? ui(language, "Ngân sách dự kiến / Chưa xác định", "Budget / Not specified")
                  : ui(language, "Đơn giá chào / Thỏa thuận", "Asking price / Negotiable"),
              )}
              {field(
                "industry",
                language === "vi"
                  ? isSupply
                    ? "Ngành nghề dự kiến"
                    : "Ngành nghề tiếp nhận"
                  : "Suitable industry",
              )}
              {field(
                "availabilityDate",
                isSupply
                  ? ui(language, "Thời điểm cần bàn giao", "Required date")
                  : ui(language, "Thời điểm sẵn sàng bàn giao", "Available from"),
                "date",
              )}
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
              {field("email", "Email", "email")}
              {field("phone", ui(language, "Số điện thoại", "Phone"))}
            </div>
          </div>
          <div className="form-section">
            <h2>
              3.{" "}
              {ui(language, "Gói hỗ trợ mong muốn", "Preferred service")}
            </h2>
            <div className="service-options">
              {(isSupply
                ? [
                    "Find Supply",
                    "Premium Matching",
                    "Supply Sourcing",
                    "Meeting / Connection",
                  ]
                : [
                    "Find Demand",
                    "Premium Matching",
                    "Market Outreach",
                    "Meeting / Connection",
                  ]
              ).map((x) => (
                <label key={x} className={form.service === x ? "selected" : ""}>
                  <input
                    type="radio"
                    name="service"
                    checked={form.service === x}
                    onChange={() => update("service", x)}
                  />
                  <CheckCircle2 />
                  <span>{x}</span>
                </label>
              ))}
            </div>
          </div>
          <label className="consent">
            <input type="checkbox" required />
            {ui(language, "Tôi đồng ý để VIG sử dụng thông tin đã cung cấp nhằm hỗ trợ tìm kiếm và kết nối đối tác.", "I agree that VIG may use this information to coordinate the connection.")}
          </label>
          <button className="button primary submit">
            <Send />
            {ui(language, "Gửi yêu cầu cho VIG", "Submit request")}
          </button>
        </form>
        <aside className="request-aside">
          <ShieldCheck />
          <h3>
            {ui(language, "Quy trình hỗ trợ của VIG", "Admin-assisted workflow")}
          </h3>
          {[
            ui(language, "Tiếp nhận yêu cầu", "Receive request"),
            ui(language, "Rà soát và xác minh", "Verify information"),
            ui(language, "Đề xuất phương án phù hợp", "Match candidates"),
            ui(language, "Kết nối các bên", "Coordinate connection"),
          ].map((x, i) => (
            <div key={x}>
              <span>{i + 1}</span>
              <b>{x}</b>
            </div>
          ))}
          <small>
            {ui(language, "Phiên bản demo chỉ mô phỏng quy trình tiếp nhận và kết nối; không thực hiện giao dịch, thanh toán hoặc tổ chức cuộc họp.", "The demo does not execute transactions, payments or live meetings.")}
          </small>
        </aside>
      </div>
    </PublicShell>
  );
}
function ConfirmationPage() {
  const { id } = useParams();
  const { language, requests } = useApp();
  const r = requests.find((x) => x.id === id);
  return (
    <PublicShell>
      <div className="page confirmation">
        <CheckCircle2 />
        <span>
          {ui(language, "GỬI YÊU CẦU THÀNH CÔNG", "SUBMITTED")}
        </span>
        <h1>
          {ui(language, "VIG đã tiếp nhận yêu cầu", "VIG received your request")}
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
              <small>{ui(language, "Dịch vụ", "Service")}</small>
              <b>{r.service}</b>
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
          {ui(language, "VIG Admin đã được thông báo. Đây là luồng mô phỏng và không gửi dữ liệu ra bên ngoài.", "VIG Admin has been notified. This is a simulation and no data was transmitted externally.")}
        </p>
        <div>
          <Link className="button primary" to="/industrial-parks">
            {ui(language, "Tiếp tục khám phá", "Continue exploring")}
          </Link>
          <Link className="button outline" to="/home">
            Home
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}
function ExpoPage() {
  const { language, expos } = useApp();
  return (
    <PublicShell>
      <div className="expo-hero">
        <div className="page">
          <Globe2 />
          <span>{ui(language, "TRIỂN LÃM CÔNG NGHIỆP SỐ", "DIGITAL TRADEXPO")}</span>
          <h1>
            {ui(language, "Triển lãm Công nghiệp số", "Digital Industrial Expo")}
          </h1>
          <p>
            {ui(language, "Kết nối doanh nghiệp Việt Nam với thị trường quốc tế qua gian hàng số và phiên kết nối trực tuyến.", "Connect Vietnamese enterprises with global markets through digital booths and online sessions.")}
          </p>
        </div>
      </div>
      <div className="page section">
        <div className="expo-grid">
          {expos.map((e) => (
            <article key={e.id}>
              <Badge
                value={e.status}
                tone={e.status === "live" ? "red" : "amber"}
              />
              <Globe2 />
              <h2>{tr(e.title, language)}</h2>
              <p>{e.industries.join(" · ")}</p>
              <div>
                <span>
                  <Clock3 /> {e.date}
                </span>
                <span>
                  <Users /> {e.exhibitors} exhibitors
                </span>
              </div>
              <button
                className="button primary"
                onClick={() =>
                  alert(
                    ui(language, "Mô phỏng: mở trang chi tiết Expo", "Demo: open Expo detail"),
                  )
                }
              >
                {ui(language, "Khám phá Expo", "Explore Expo")}
              </button>
            </article>
          ))}
        </div>
      </div>
    </PublicShell>
  );
}
function LoginPage() {
  const { language, setRole } = useApp();
  const navigate = useNavigate();
  return (
    <PublicShell>
      <div className="login-page">
        <div className="login-card">
          <span className="brand-mark">VIG</span>
          <h1>
            {ui(language, "Truy cập hệ thống quản trị VIG", "Access VIG Admin")}
          </h1>
          <p>
            {ui(language, "Phiên bản demo cho phép truy cập trực tiếp, không yêu cầu tài khoản.", "Demo mode does not require real credentials.")}
          </p>
          <button
            className="button primary"
            onClick={() => {
              setRole("admin");
              navigate("/admin/dashboard");
            }}
          >
            <ShieldCheck />{" "}
            {ui(language, "Vào trang quản trị", "Enter admin console")}
          </button>
          <Link to="/home">
            {ui(language, "Quay lại trang công khai", "Return to public portal")}
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}

function AdminGuard({ children }: { children: ReactNode }) {
  const { role } = useApp();
  return role === "admin" ? children : <Navigate to="/login" replace />;
}
function AdminShell({ children }: { children: ReactNode }) {
  const { language, setRole, resetDemo } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const openPublicPortal = () => {
    navigate("/home");
    window.setTimeout(() => setRole("public"), 0);
  };
  const links = [
    [
      "/admin/dashboard",
      LayoutDashboard,
      ui(language, "Tổng quan", "Overview"),
    ],
    [
      "/admin/industrial-parks",
      Factory,
      ui(language, "Dữ liệu KCN", "Park data"),
    ],
    [
      "/admin/expos",
      BarChart3,
      ui(language, "Quản lý Expo", "Expo management"),
    ],
    [
      "/admin/requests",
      ClipboardCheck,
      ui(language, "Quản lý yêu cầu", "Request management"),
    ],
  ];
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link to="/admin/dashboard" className="admin-brand">
          <span>VIG</span>
          <div>
            <b>VIG Admin</b>
            <small>{ui(language, "Trung tâm vận hành", "Operations Console")}</small>
          </div>
        </Link>
        <nav>
          {links.map(([path, I, label]) => {
            const Icon = I as typeof Factory;
            return (
              <Link
                className={
                  location.pathname.startsWith(path as string) ? "active" : ""
                }
                to={path as string}
                key={String(path)}
              >
                <Icon size={19} />
                {String(label)}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <button onClick={resetDemo}>
            <RotateCcw />
            {ui(language, "Khôi phục dữ liệu demo", "Reset demo")}
          </button>
          <button onClick={openPublicPortal}>
            <Globe2 />
            {ui(language, "Trang công khai", "Public portal")}
          </button>
        </div>
      </aside>
      <div className="admin-main">
        <header>
          <div>
            <b>
              {ui(language, "Trung tâm điều hành VIG", "VIG Operations Centre")}
            </b>
            <small>
              {ui(language, "Quản trị dữ liệu và kết nối đầu tư", "Industrial data and connections")}
            </small>
          </div>
          <div className="admin-mobile-actions">
            <LanguageToggle compact />
            <button
              aria-label={
                ui(language, "Khôi phục dữ liệu demo", "Reset demo")
              }
              onClick={resetDemo}
            >
              <RotateCcw />
            </button>
            <button
              aria-label={
                ui(language, "Trang công khai", "Public portal")
              }
              onClick={openPublicPortal}
            >
              <Globe2 />
            </button>
          </div>
          <div className="admin-header-controls">
            <LanguageToggle />
            <div className="admin-user">
              VA<span>VIG Admin</span>
            </div>
          </div>
        </header>
        <nav className="admin-mobile-nav">
          {links.map(([path, I, label]) => {
            const Icon = I as typeof Factory;
            return (
              <Link
                className={
                  location.pathname.startsWith(path as string) ? "active" : ""
                }
                to={path as string}
                key={String(path)}
              >
                <Icon size={17} />
                <span>{String(label)}</span>
              </Link>
            );
          })}
        </nav>
        <main>{children}</main>
      </div>
    </div>
  );
}
function Kpi({
  label,
  value,
  icon: Icon,
  tone = "blue",
}: {
  label: string;
  value: number | string;
  icon: typeof Activity;
  tone?: string;
}) {
  return (
    <article className={`kpi ${tone}`}>
      <div>
        <span>{label}</span>
        <b>{value}</b>
      </div>
      <Icon />
    </article>
  );
}
function AdminDashboard() {
  const { language, parks, requests, expos } = useApp();
  return (
    <AdminShell>
      <div className="admin-page">
        <div className="admin-title">
          <div>
            <span>{ui(language, "VẬN HÀNH VIG", "VIG OPERATIONS")}</span>
            <h1>
              {ui(language, "Tổng quan vận hành", "Operations overview")}
            </h1>
          </div>
          <Link className="button primary" to="/admin/requests">
            <ClipboardCheck />{" "}
            {ui(language, "Xử lý yêu cầu", "Process requests")}
          </Link>
        </div>
        <div className="kpi-grid">
          <Kpi
            label={
              ui(language, "Hồ sơ khu công nghiệp", "Park profiles")
            }
            value={parks.length}
            icon={Factory}
          />
          <Kpi
            label={ui(language, "Hồ sơ đã công bố", "Published")}
            value={
              parks.filter((p) => p.publicationStatus === "published").length
            }
            icon={ShieldCheck}
            tone="green"
          />
          <Kpi
            label={ui(language, "Kết nối", "Connections")}
            value={
              requests.length +
              expos.reduce(
                (total, expo) =>
                  total +
                  expo.analytics.inboundRequests +
                  expo.analytics.outboundRequests,
                0,
              )
            }
            icon={Handshake}
            tone="gold"
          />
          <Kpi
            label={ui(language, "Kết nối thành công", "Completed connections")}
            value={expos.reduce((total, expo) => total + expo.analytics.completedConnections, 0)}
            icon={Handshake}
            tone="green"
          />
        </div>
        <div className="admin-grid">
          <section className="admin-panel">
            <div className="panel-head">
              <h2>
                {ui(language, "Yêu cầu mới nhất", "Recent requests")}
              </h2>
              <Link to="/admin/requests">
                {ui(language, "Xem tất cả", "View all")}
              </Link>
            </div>
            <RequestTable requests={requests.slice(0, 5)} />
          </section>
          <section className="admin-panel">
            <div className="panel-head">
              <h2>
                {ui(language, "Đối chiếu bộ dữ liệu chuẩn", "Dataset standard review")}
              </h2>
              <Link to="/admin/industrial-parks">
                {ui(language, "Quản lý hồ sơ", "Manage")}
              </Link>
            </div>
            <div className="quality-list">
              {parks.slice(0, 6).map((p) => {
                const missingRequired = getParkStandardChecklist(p).some(
                  (item) => item.requiredForPublication && item.status === "missing",
                );
                return (
                  <Link to={`/admin/industrial-parks/${p.id}`} key={p.id}>
                    <div>
                      <b>{tr(p.name, language)}</b>
                      <small>{p.province}</small>
                    </div>
                    <span className={`standard-state ${missingRequired ? "missing" : "available"}`}>
                      {missingRequired
                        ? ui(language, "Cần bổ sung", "Needs data")
                        : ui(language, "Đủ nhóm bắt buộc", "Required groups present")}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}

const formatReportNumber = (value: number, language: Language) =>
  new Intl.NumberFormat(ui(language, "vi-VN", "en-US"), {
    notation: value >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
const formatReportUsd = (value: number, language: Language) =>
  language === "vi"
    ? `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(value / 1_000_000)} triệu USD`
    : language === "zh"
      ? `${new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 1 }).format(value / 1_000_000)}百万美元`
    : `$${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value / 1_000_000)}M`;

function ExpoTrendChart({ data }: { data: ExpoDailyMetric[] }) {
  const { language } = useApp();
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

function AdminExpos() {
  const { language, expos } = useApp();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const filtered = expos.filter((expo) =>
    (status === "all" || expo.status === status) &&
    `${tr(expo.title, language)} ${expo.market}`.toLowerCase().includes(query.toLowerCase()),
  );
  const totals = expos.reduce(
    (sum, expo) => ({
      exhibitors: sum.exhibitors + expo.exhibitors,
      connections: sum.connections + expo.analytics.inboundRequests + expo.analytics.outboundRequests,
      deals: sum.deals + expo.analytics.inboundDeals + expo.analytics.outboundDeals,
      completed: sum.completed + expo.analytics.completedConnections,
    }),
    { exhibitors: 0, connections: 0, deals: 0, completed: 0 },
  );
  const trend = expos[0].analytics.trend.map((item, index) => ({
    date: item.date,
    requests: expos.reduce((sum, expo) => sum + (expo.analytics.trend[index]?.requests || 0), 0),
    connections: expos.reduce((sum, expo) => sum + (expo.analytics.trend[index]?.connections || 0), 0),
  }));
  const allConnections = totals.connections || 1;
  return (
    <AdminShell>
      <div className="admin-page expo-admin-page">
        <div className="admin-title">
          <div>
            <span>{ui(language, "VẬN HÀNH EXPO", "EXPO OPERATIONS")}</span>
            <h1>{ui(language, "Quản lý Expo", "Expo Management")}</h1>
            <p>{ui(language, "Theo dõi yêu cầu, giao dịch và kết quả kết nối theo từng Expo.", "Track requests, deals, and connection outcomes for each Expo.")}</p>
          </div>
          <span className="demo-data-label">{ui(language, "Dữ liệu mô phỏng", "Demo data")}</span>
        </div>
        <div className="kpi-grid">
          <Kpi label={ui(language, "Expo đang quản lý", "Managed Expos")} value={expos.length} icon={Globe2} />
          <Kpi label={ui(language, "Đơn vị trưng bày", "Exhibitors")} value={formatReportNumber(totals.exhibitors, language)} icon={Building2} tone="gold" />
          <Kpi label={ui(language, "Kết nối", "Connections")} value={formatReportNumber(totals.connections, language)} icon={Handshake} />
          <Kpi label={ui(language, "Kết nối thành công", "Completed connections")} value={formatReportNumber(totals.completed, language)} icon={Handshake} tone="green" />
        </div>
        <div className="expo-report-grid">
          <section className="admin-panel expo-chart-panel">
            <div className="panel-head">
              <div>
                <h2><BarChart3 /> {ui(language, "Xu hướng hoạt động kết nối", "Connection activity trend")}</h2>
                <small>{ui(language, "Tổng hợp 7 ngày gần nhất từ tất cả Expo", "Combined last 7 days across all Expos")}</small>
              </div>
            </div>
            <ExpoTrendChart data={trend} />
          </section>
          <section className="admin-panel connection-summary-panel">
            <div className="panel-head"><h2><Handshake /> {ui(language, "Tổng quan chuyển đổi", "Conversion overview")}</h2></div>
            <div className="conversion-ring" style={{ "--progress": `${Math.round((totals.completed / allConnections) * 100)}%` } as CSSProperties}>
              <div><b>{Math.round((totals.completed / allConnections) * 100)}%</b><span>{ui(language, "Kết nối → thành công", "Connection → completed")}</span></div>
            </div>
            <div className="connection-mini-stats">
              <div><span>{ui(language, "Giao dịch I/O", "I/O deals")}</span><b>{totals.deals}</b></div>
              <div><span>{ui(language, "Expo đang diễn ra", "Live Expos")}</span><b>{expos.filter((expo) => expo.status === "live").length}</b></div>
            </div>
          </section>
        </div>
        <section className="admin-panel">
          <div className="panel-head">
            <div>
              <h2>{ui(language, "Báo cáo theo Expo", "Reports by Expo")}</h2>
              <small>{ui(language, "Chọn một Expo để xem báo cáo kết nối chi tiết.", "Select an Expo to review its detailed connection report.")}</small>
            </div>
          </div>
          <div className="admin-filter expo-report-filter">
            <label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={ui(language, "Tìm theo tên hoặc thị trường", "Search name or market")} /></label>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">{ui(language, "Tất cả trạng thái", "All statuses")}</option>
              <option value="live">{ui(language, "Đang diễn ra", "Live")}</option>
              <option value="upcoming">{ui(language, "Sắp diễn ra", "Upcoming")}</option>
            </select>
          </div>
          <div className="table-wrap expo-report-table">
            <table>
              <thead><tr>
                <th>Expo</th><th>{ui(language, "Trạng thái", "Status")}</th><th>{ui(language, "Khách truy cập", "Visitors")}</th><th>{ui(language, "Kết nối I / O", "Connections I / O")}</th><th>{ui(language, "Giao dịch I / O", "Deals I / O")}</th><th>{ui(language, "Kết nối thành công", "Completed")}</th><th></th>
              </tr></thead>
              <tbody>{filtered.map((expo) => <tr key={expo.id}>
                <td><b>{tr(expo.title, language)}</b><small>{expo.market} · {expo.date}</small></td>
                <td><ExpoStatus expo={expo} /></td>
                <td>{formatReportNumber(expo.analytics.visitors, language)}</td>
                <td><span className="io-metric"><i>I</i>{expo.analytics.inboundRequests}<i>O</i>{expo.analytics.outboundRequests}</span></td>
                <td><span className="io-metric"><i>I</i>{expo.analytics.inboundDeals}<i>O</i>{expo.analytics.outboundDeals}</span></td>
                <td><b className="success-value">{expo.analytics.completedConnections}</b></td>
                <td><Link className="table-action" to={`/admin/expos/${expo.id}`}>{ui(language, "Xem báo cáo", "View report")}<ChevronRight /></Link></td>
              </tr>)}</tbody>
            </table>
          </div>
        </section>
        <p className="report-source-note">{ui(language, "Mô hình báo cáo tham chiếu Partner Portal: RFQ và Request được hợp nhất thành chỉ số Kết nối; khách truy cập được cập nhật gần thời gian thực; đơn vị trưng bày và sản phẩm theo bản chụp. Bản TSX này sử dụng dữ liệu mô phỏng tĩnh.", "Reporting model adapted from Partner Portal: RFQs and Requests are consolidated into the Connection metric; visitors are near real time, while exhibitor and product totals are snapshots. This TSX demo uses static fixture data.")}</p>
      </div>
    </AdminShell>
  );
}

function AdminExpoDetail() {
  const { language, expos } = useApp();
  const { id } = useParams();
  const expo = expos.find((item) => item.id === id);
  if (!expo) return <Navigate to="/admin/expos" replace />;
  const report = expo.analytics;
  const totalConnections = report.inboundRequests + report.outboundRequests;
  const conversion = totalConnections ? Math.round((report.completedConnections / totalConnections) * 100) : 0;
  const maxMarket = Math.max(...report.topMarkets.map((item) => item.connections), 1);
  return (
    <AdminShell>
      <div className="admin-page expo-admin-page">
        <div className="admin-breadcrumb"><Link to="/admin/expos">{ui(language, "Quản lý Expo", "Expo Management")}</Link><ChevronRight />{tr(expo.title, language)}</div>
        <div className="admin-title expo-detail-title">
          <div><div className="title-badges"><ExpoStatus expo={expo} /><span className="demo-data-label">{ui(language, "Dữ liệu mô phỏng", "Demo data")}</span></div><h1>{tr(expo.title, language)}</h1><p>{expo.market} · {expo.date} · {expo.industries.map((industry) => industryLabel(industry, language)).join(" · ")}</p></div>
          <div className="report-updated"><Clock3 /><span>{ui(language, "Cập nhật lúc", "Updated")}<b>{new Date(report.updatedAt).toLocaleString(ui(language, "vi-VN", "en-US"))}</b></span></div>
        </div>
        <div className="kpi-grid">
          <Kpi label={ui(language, "Khách truy cập", "Visitors")} value={formatReportNumber(report.visitors, language)} icon={Users} />
          <Kpi label={ui(language, "Đơn vị trưng bày", "Exhibitors")} value={expo.exhibitors} icon={Building2} tone="gold" />
          <Kpi label={ui(language, "Sản phẩm trưng bày", "Products")} value={formatReportNumber(report.products, language)} icon={PackageSearch} />
          <Kpi label={ui(language, "Kết nối thành công", "Completed connections")} value={report.completedConnections} icon={Handshake} tone="green" />
        </div>
        <div className="expo-report-grid">
          <section className="admin-panel expo-chart-panel">
            <div className="panel-head"><div><h2><BarChart3 /> {ui(language, "Kết nối và kết quả theo ngày", "Daily connections and outcomes")}</h2><small>{ui(language, "Hoạt động trong 7 ngày gần nhất", "Activity over the last 7 days")}</small></div></div>
            <ExpoTrendChart data={report.trend} />
          </section>
          <section className="admin-panel connection-summary-panel">
            <div className="panel-head"><h2><Activity /> {ui(language, "Hiệu quả kết nối", "Connection performance")}</h2></div>
            <div className="conversion-ring" style={{ "--progress": `${conversion}%` } as CSSProperties}><div><b>{conversion}%</b><span>{ui(language, "Kết nối → thành công", "Connection → completed")}</span></div></div>
            <div className="connection-mini-stats"><div><span>{ui(language, "Đang kết nối", "Active")}</span><b>{report.activeConnections}</b></div><div><span>{ui(language, "Giá trị giao dịch dự kiến", "Est. deal value")}</span><b>{formatReportUsd(report.estimatedDealValueUsd, language)}</b></div></div>
          </section>
        </div>
        <section className="admin-panel">
          <div className="panel-head"><div><h2><Handshake /> {ui(language, "Hoạt động kết nối hai chiều", "Inbound / outbound connection activity")}</h2><small>{ui(language, "I = tiếp nhận từ đối tác; O = chủ động gửi tới đối tác.", "I = received from partners; O = initiated toward partners.")}</small></div></div>
          <div className="io-report-grid">
            <article className="io-report-card inbound"><div><span>I</span><div><b>{ui(language, "Luồng tiếp nhận", "Inbound")}</b><small>{ui(language, "Nhu cầu gửi đến đơn vị trưng bày", "Demand received by exhibitors")}</small></div></div><dl><div><dt>{ui(language, "Kết nối", "Connections")}</dt><dd>{report.inboundRequests}</dd></div><div><dt>{ui(language, "Giao dịch", "Deals")}</dt><dd>{report.inboundDeals}</dd></div></dl></article>
            <article className="io-report-card outbound"><div><span>O</span><div><b>{ui(language, "Luồng chủ động", "Outbound")}</b><small>{ui(language, "Nhu cầu do đơn vị tham gia khởi tạo", "Demand initiated by participants")}</small></div></div><dl><div><dt>{ui(language, "Kết nối", "Connections")}</dt><dd>{report.outboundRequests}</dd></div><div><dt>{ui(language, "Giao dịch", "Deals")}</dt><dd>{report.outboundDeals}</dd></div></dl></article>
            <article className="io-report-card completed"><div><CheckCircle2 /><div><b>{ui(language, "Kết nối thành công", "Completed connections")}</b><small>{ui(language, "Hai bên đã xác nhận kết quả kết nối", "Outcome confirmed by both parties")}</small></div></div><strong>{report.completedConnections}</strong></article>
          </div>
        </section>
        <div className="expo-report-grid lower">
          <section className="admin-panel"><div className="panel-head"><h2>{ui(language, "Hiệu quả theo ngành", "Performance by industry")}</h2></div><div className="industry-report-list">{report.topIndustries.map((item) => <div key={item.industry}><span><b>{industryLabel(item.industry, language)}</b><small>{item.requests} {ui(language, "kết nối", "connections")}</small></span><strong>{item.connections}<small>{ui(language, " thành công", " completed")}</small></strong></div>)}</div></section>
          <section className="admin-panel"><div className="panel-head"><h2>{ui(language, "Kết nối theo thị trường", "Connections by market")}</h2></div><div className="market-report-bars">{report.topMarkets.map((item) => <div key={item.market}><span><b>{item.market}</b><strong>{item.connections}</strong></span><i><em style={{ width: `${(item.connections / maxMarket) * 100}%` }} /></i></div>)}</div></section>
        </div>
        <section className="admin-panel metric-definition-panel"><div className="panel-head"><h2>{ui(language, "Định nghĩa chỉ số", "Metric definitions")}</h2></div><div className="metric-definitions"><p><b>{ui(language, "Kết nối I/O", "Connections I/O")}</b>{ui(language, "Hợp nhất RFQ và Request được tiếp nhận hoặc chủ động gửi trong Expo.", "Consolidates RFQs and Requests received or initiated within the Expo.")}</p><p><b>{ui(language, "Giao dịch I/O", "Deals I/O")}</b>{ui(language, "Cơ hội giao dịch được tạo từ luồng tiếp nhận hoặc chủ động.", "Deal opportunities created from inbound or outbound activity.")}</p><p><b>{ui(language, "Kết nối thành công", "Completed connection")}</b>{ui(language, "Kết nối được hai bên xác nhận; không đồng nghĩa giao dịch đã ký hoặc đã thanh toán.", "A connection confirmed by both parties; it does not mean a contract was signed or paid.")}</p></div></section>
      </div>
    </AdminShell>
  );
}

function RequestTable({ requests }: { requests: IndustrialRequest[] }) {
  const { language } = useApp();
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>{ui(language, "Loại", "Funnel")}</th>
            <th>{ui(language, "Doanh nghiệp", "Organisation")}</th>
            <th>{ui(language, "Tỉnh/thành, khu vực", "Location")}</th>
            <th>{ui(language, "Trạng thái", "Status")}</th>
            <th>SLA</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => (
            <tr key={r.id}>
              <td>
                <Link to={`/admin/requests/${r.id}`}>{r.id}</Link>
              </td>
              <td>
                {r.kind === "find_supply"
                  ? ui(language, "Tìm mặt bằng", "Find Supply")
                  : ui(language, "Tìm khách thuê/mua", "Find Demand")}
              </td>
              <td>
                <b>{r.organization}</b>
                <small>{r.assetType}</small>
              </td>
              <td>{r.location}</td>
              <td>
                <Badge value={r.status} />
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
                    ? "4h"
                    : ui(language, "Đúng tiến độ", "On track")}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
            <span>{ui(language, "QUẢN LÝ YÊU CẦU", "REQUEST MANAGEMENT")}</span>
            <h1>
              {ui(language, "Quản lý yêu cầu Cung – Cầu", "Supply–Demand request management")}
            </h1>
            <p>
              {ui(language, "Tiếp nhận, xác minh, ghép nối và điều phối kết nối.", "Receive, verify, match and coordinate connections.")}
            </p>
          </div>
        </div>
        <div className="admin-filter">
          <label>
            <Search />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={
                ui(language, "Tìm mã hoặc doanh nghiệp", "Search ID or organisation")
              }
            />
          </label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">
              {ui(language, "Tất cả trạng thái", "All statuses")}
            </option>
            {Object.keys(requestTransitions).map((x) => (
              <option value={x} key={x}>
                {x.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <section className="admin-panel">
          <RequestTable requests={filtered} />
        </section>
      </div>
    </AdminShell>
  );
}
function RequestDetail() {
  const { id } = useParams();
  const { language, requests, parks, transitionRequest } = useApp();
  const r = requests.find((x) => x.id === id);
  const [reason, setReason] = useState("");
  if (!r) return <Navigate to="/admin/requests" />;
  const matches = parks
    .filter(
      (p) =>
        p.suitableIndustries.some((x) =>
          x.toLowerCase().includes(r.industry.toLowerCase()),
        ) || p.region === "North",
    )
    .slice(0, 3);
  const next = requestTransitions[r.status];
  return (
    <AdminShell>
      <div className="admin-page">
        <div className="breadcrumbs">
          <Link to="/admin/requests">Requests</Link>
          <ChevronRight size={14} />
          <span>{r.id}</span>
        </div>
        <div className="admin-title">
          <div>
            <span>
              {r.kind === "find_supply"
                ? "FUNNEL B · FIND SUPPLY"
                : "FUNNEL A · FIND DEMAND"}
            </span>
            <h1>{r.organization}</h1>
            <p>
              {r.id} ·{" "}
              {new Date(r.submittedAt).toLocaleString(
                ui(language, "vi-VN", "en-US"),
              )}
            </p>
          </div>
          <Badge value={r.status} tone="blue" />
        </div>
        <div className="request-detail-grid">
          <div>
            <section className="admin-panel request-summary">
              <h2>
                {ui(language, "Chi tiết yêu cầu", "Request details")}
              </h2>
              <div className="info-grid">
                <div>
                  <small>
                    {ui(language, "Người liên hệ", "Contact")}
                  </small>
                  <b>{r.contactName}</b>
                  <span>
                    {r.email} · {r.phone}
                  </span>
                </div>
                <div>
                  <small>
                    {ui(language, "Loại hình bất động sản", "Asset")}
                  </small>
                  <b>{r.assetType}</b>
                  <span>{r.transaction}</span>
                </div>
                <div>
                  <small>
                    {ui(language, "Vị trí/khu vực", "Location")}
                  </small>
                  <b>{r.location}</b>
                  <span>
                    {r.areaMin.toLocaleString()}–{r.areaMax.toLocaleString()} m²
                  </span>
                </div>
                <div>
                  <small>
                    {ui(language, "Tên khu công nghiệp", "Industrial park name")}
                  </small>
                  <b>
                    {r.industrialParkName ||
                      (ui(language, "Chưa xác định", "Not specified"))}
                  </b>
                </div>
                <div>
                  <small>
                    {ui(language, "Ngành nghề dự kiến", "Industry")}
                  </small>
                  <b>{r.industry}</b>
                  <span>{r.availabilityDate}</span>
                </div>
                <div>
                  <small>
                    {ui(language, "Ngân sách / giá", "Budget / price")}
                  </small>
                  <b>
                    {r.budgetOrPrice ||
                      (ui(language, "Chưa xác định", "Not specified"))}
                  </b>
                </div>
                <div>
                  <small>{ui(language, "Dịch vụ", "Service")}</small>
                  <b>{r.service}</b>
                </div>
              </div>
              <h3>
                {ui(language, "Yêu cầu khác", "Other requirements")}
              </h3>
              <p>{r.requirements || "—"}</p>
            </section>
            <section className="admin-panel">
              <div className="panel-head">
                <h2>
                  <Sparkles />{" "}
                  {ui(language, "Đề xuất ghép nối", "Match recommendations")}
                </h2>
                <span className="demo-label">
                  {ui(language, "ĐỀ XUẤT MÔ PHỎNG", "DEMO RECOMMENDATION")}
                </span>
              </div>
              {r.status === "submitted" || r.status === "under_review" ? (
                <Empty
                  title={
                    ui(language, "Chưa bắt đầu ghép nối", "Matching not started")
                  }
                  text={
                    ui(language, "Xác minh yêu cầu trước khi tạo đề xuất.", "Verify the request before generating recommendations.")
                  }
                />
              ) : (
                <div className="match-list">
                  {matches.map((p, i) => (
                    <article key={p.id}>
                      <div className="match-score">
                        {92 - i * 7}
                        <small>/100</small>
                      </div>
                      <div>
                        <Link to={`/admin/industrial-parks/${p.id}`}>
                          {tr(p.name, language)}
                        </Link>
                        <p>
                          {p.province} ·{" "}
                          {p.suitableIndustries
                            .slice(0, 2)
                            .map((x) => industryLabel(x, language))
                            .join(", ")}
                        </p>
                        <span>
                          <Check />{" "}
                          {ui(language, "Khớp khu vực, ngành và loại tài sản", "Region, industry and asset-type match")}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
          <aside>
            <section className="admin-panel status-action">
              <h2>
                {ui(language, "Cập nhật trạng thái", "Update status")}
              </h2>
              <Badge value={r.status} />
              <div className="status-flow">
                {[
                  "submitted",
                  "under_review",
                  "verified",
                  "matching",
                  "connection_scheduled",
                  "closed",
                ].map((x, i) => (
                  <span
                    className={
                      x === r.status
                        ? "current"
                        : requestTransitions[x as RequestStatus]
                          ? ""
                          : ""
                    }
                    key={x}
                  >
                    {i + 1} {tr(labels[x], language)}
                  </span>
                ))}
              </div>
              {next.map((x) =>
                x === "rejected" ? (
                  <div key={x} className="reject-box">
                    <textarea
                      placeholder={
                        ui(language, "Lý do từ chối (bắt buộc)", "Rejection reason (required)")
                      }
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                    <button
                      disabled={!reason.trim()}
                      onClick={() => transitionRequest(r.id, x, reason)}
                    >
                      {ui(language, "Từ chối yêu cầu", "Reject")}
                    </button>
                  </div>
                ) : (
                  <button
                    className="button primary full"
                    key={x}
                    onClick={() => transitionRequest(r.id, x)}
                  >
                    {ui(language, "Chuyển trạng thái sang", "Move to")}{" "}
                    {tr(labels[x], language)}
                    <ArrowRight />
                  </button>
                ),
              )}
            </section>
            <section className="admin-panel">
              <h2>
                {ui(language, "Lịch sử hoạt động", "Activity timeline")}
              </h2>
              <div className="timeline">
                {r.activities.map((a) => (
                  <div key={a.id}>
                    <i />
                    <b>{tr(a.action, language)}</b>
                    <span>{a.actor}</span>
                    <small>
                      {new Date(a.at).toLocaleString(
                        ui(language, "vi-VN", "en-US"),
                      )}
                    </small>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </AdminShell>
  );
}
function AdminParks() {
  const { language, parks } = useApp();
  const [q, setQ] = useState("");
  const [quality, setQuality] = useState("all");
  const filtered = parks.filter(
    (p) =>
      (!q ||
        `${tr(p.name, language)} ${p.province}`
          .toLowerCase()
          .includes(q.toLowerCase())) &&
      (quality === "all" ||
        (quality === "missing"
          ? getParkStandardChecklist(p).some((item) => item.status === "missing")
          : p.conflicts?.length)),
  );
  return (
    <AdminShell>
      <div className="admin-page">
        <div className="admin-title">
          <div>
            <span>INDUSTRIAL DATA LAYER</span>
            <h1>
              {ui(language, "Quản lý hồ sơ khu công nghiệp", "Industrial park data management")}
            </h1>
            <p>
              {ui(language, "Đối chiếu từng nhóm dữ liệu của hồ sơ với bộ dữ liệu chuẩn khu công nghiệp.", "Compare each profile data group with the industrial park dataset standard.")}
            </p>
          </div>
        </div>
        <div className="admin-filter">
          <label>
            <Search />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={ui(language, "Tìm hồ sơ", "Search profiles")}
            />
          </label>
          <select value={quality} onChange={(e) => setQuality(e.target.value)}>
            <option value="all">
              {ui(language, "Tất cả hồ sơ", "All profiles")}
            </option>
            <option value="missing">
              {ui(language, "Thiếu nhóm dữ liệu chuẩn", "Missing standard data")}
            </option>
            <option value="conflict">
              {ui(language, "Có dữ liệu xung đột", "Conflicts")}
            </option>
          </select>
        </div>
        <section className="admin-panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>
                    {ui(language, "Khu công nghiệp", "Industrial park")}
                  </th>
                  <th>{ui(language, "Tỉnh", "Province")}</th>
                  <th>{ui(language, "Đối chiếu chuẩn", "Standard review")}</th>
                  <th>
                    {ui(language, "Xác minh gần nhất", "Verified")}
                  </th>
                  <th>
                    {ui(language, "Trạng thái công bố", "Publication")}
                  </th>
                  <th>{ui(language, "Cảnh báo", "Warnings")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link to={`/admin/industrial-parks/${p.id}`}>
                        <b>{tr(p.name, language)}</b>
                      </Link>
                      <small>
                        {p.id.includes("demo")
                          ? ui(language, "DỮ LIỆU MINH HỌA", "DEMO DATA")
                          : ui(language, "HỒ SƠ THAM CHIẾU", "REFERENCE PROFILE")}
                      </small>
                    </td>
                    <td>{p.province}</td>
                    <td>
                      {getParkStandardChecklist(p).some(
                        (item) => item.requiredForPublication && item.status === "missing",
                      ) ? (
                        <span className="standard-state missing">
                          {ui(language, "Cần bổ sung", "Needs data")}
                        </span>
                      ) : (
                        <span className="standard-state available">
                          {ui(language, "Đủ nhóm bắt buộc", "Required groups present")}
                        </span>
                      )}
                    </td>
                    <td>{p.lastVerifiedAt || "—"}</td>
                    <td>
                      <Badge value={p.publicationStatus} />
                    </td>
                    <td>
                      {p.conflicts?.length ? (
                        <span className="warning-count">
                          {p.conflicts.length}{" "}
                          {ui(language, "xung đột", "conflict")}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
function AdminParkDetail() {
  const { id } = useParams();
  const { language, parks, updateParkPublication } = useApp();
  const p = parks.find((x) => x.id === id);
  if (!p) return <Navigate to="/admin/industrial-parks" />;
  return (
    <AdminShell>
      <div className="admin-page">
        <div className="breadcrumbs">
          <Link to="/admin/industrial-parks">
            {ui(language, "Hồ sơ khu công nghiệp", "Industrial parks")}
          </Link>
          <ChevronRight size={14} />
          <span>{tr(p.name, language)}</span>
        </div>
        <div className="admin-title">
          <div>
            <span>
              {p.id.includes("demo")
                ? ui(language, "DỮ LIỆU MINH HỌA", "DEMO DATA")
                : ui(language, "HỒ SƠ THAM CHIẾU", "REFERENCE PROFILE")}
            </span>
            <h1>{tr(p.name, language)}</h1>
            <p>
              {p.province} · {p.dataOwner}
            </p>
          </div>
          <Link className="button outline" to={`/industrial-parks/${p.slug}`}>
            <ExternalLink />
            {ui(language, "Xem trang công khai", "Public preview")}
          </Link>
        </div>
        <div className="kpi-grid three">
          <Kpi
            label={ui(language, "Nguồn tài liệu", "Source documents")}
            value={p.documents.length}
            icon={FileText}
          />
          <Kpi
            label={
              ui(language, "Hạng mục đã xác minh", "Verified fields")
            }
            value={
              p.utilities.filter(
                (x) => x.capacity.verificationStatus === "verified",
              ).length
            }
            icon={ShieldCheck}
            tone="green"
          />
          <Kpi
            label={ui(language, "Dữ liệu xung đột", "Conflicts")}
            value={p.conflicts?.length || 0}
            icon={Activity}
            tone={p.conflicts?.length ? "red" : "blue"}
          />
        </div>
        <div className="admin-grid">
          <section className="admin-panel">
            <div className="panel-head">
              <h2>
                {ui(language, "Đối chiếu bộ dữ liệu chuẩn khu công nghiệp", "Industrial park dataset standard checklist")}
              </h2>
              <Badge value={p.publicationStatus} />
            </div>
            <p className="panel-intro">
              {ui(language, "Danh sách thể hiện nhóm dữ liệu hồ sơ đang có so với cấu trúc chuẩn; không sử dụng điểm số hoặc tỷ lệ phần trăm.", "This checklist shows which profile data groups are present against the standard; no score or percentage is used.")}
            </p>
            <StandardChecklist park={p} />
            <div className="publication-actions">
              <button
                className="button outline"
                onClick={() => updateParkPublication(p.id, "in_review")}
              >
                {ui(language, "Gửi duyệt", "Send to review")}
              </button>
              <button
                className="button primary"
                disabled={!canPublish(p)}
                onClick={() => updateParkPublication(p.id, "published")}
              >
                <ShieldCheck />
                {ui(language, "Công bố hồ sơ", "Publish profile")}
              </button>
            </div>
          </section>
          <section className="admin-panel">
            <h2>
              {ui(language, "Nguồn và quản trị dữ liệu", "Sources and governance")}
            </h2>
            <div className="governance">
              <div>
                <small>
                  {ui(language, "Đơn vị quản lý dữ liệu", "Data owner")}
                </small>
                <b>{p.dataOwner}</b>
              </div>
              <div>
                <small>
                  {ui(language, "Xác minh lần cuối", "Last verified")}
                </small>
                <b>
                  {p.lastVerifiedAt ||
                    (ui(language, "Chưa có dữ liệu", "Not available"))}
                </b>
              </div>
              <div>
                <small>
                  {ui(language, "Người xác minh", "Verified by")}
                </small>
                <b>
                  {p.verifiedBy ||
                    (ui(language, "Chưa có dữ liệu", "Not available"))}
                </b>
              </div>
              <div>
                <small>
                  {ui(language, "Ngôn ngữ nguồn", "Source language")}
                </small>
                <b>{p.sourceLanguage.toUpperCase()}</b>
              </div>
            </div>
            {p.conflicts?.map((c) => (
              <div className="warning" key={c.field}>
                <Activity />
                <div>
                  <b>{c.field}</b>
                  <p>
                    {c.primary} ↔ {c.secondary}
                  </p>
                  <small>{c.sources.join(", ")}</small>
                </div>
              </div>
            ))}
            <h3>{ui(language, "Tài liệu", "Documents")}</h3>
            <div className="mini-docs">
              {p.documents.map((d) => (
                <div key={d.id}>
                  <FileText />
                  <span>
                    <b>{tr(d.title, language)}</b>
                    <small>
                      {tr(
                        labels[d.category] || tx(d.category, d.category),
                        language,
                      )}{" "}
                      ·{" "}
                      {tr(
                        labels[d.visibility] || tx(d.visibility, d.visibility),
                        language,
                      )}
                    </small>
                  </span>
                  <Badge value={d.verificationStatus} />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/industrial-parks" element={<ParksPage />} />
      <Route path="/industrial-parks/:slug" element={<ParkDetailPage />} />
      <Route path="/assets" element={<AssetsPage />} />
      <Route path="/assets/:id" element={<AssetDetailPage />} />
      <Route
        path="/find-demand"
        element={<RequestFormPage kind="find_demand" />}
      />
      <Route
        path="/find-supply"
        element={<RequestFormPage kind="find_supply" />}
      />
      <Route path="/request-confirmation/:id" element={<ConfirmationPage />} />
      <Route path="/industrial-expo" element={<ExpoPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/admin/dashboard"
        element={
          <AdminGuard>
            <AdminDashboard />
          </AdminGuard>
        }
      />
      <Route
        path="/admin/expos"
        element={
          <AdminGuard>
            <AdminExpos />
          </AdminGuard>
        }
      />
      <Route
        path="/admin/expos/:id"
        element={
          <AdminGuard>
            <AdminExpoDetail />
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
            <RequestDetail />
          </AdminGuard>
        }
      />
      <Route
        path="/admin/industrial-parks"
        element={
          <AdminGuard>
            <AdminParks />
          </AdminGuard>
        }
      />
      <Route
        path="/admin/industrial-parks/:id"
        element={
          <AdminGuard>
            <AdminParkDetail />
          </AdminGuard>
        }
      />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AppProvider>
  );
}
