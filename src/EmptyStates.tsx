import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { FileSearch, ImageOff, Info, LoaderCircle, ShieldAlert } from 'lucide-react';
import { useApp } from './AppContext';
import { displaySourced } from './logic';
import type { Language, SourcedValue } from './types';

export const emptyCopy = (language: Language, vi: string, en: string, zh: string) =>
  language === 'vi' ? vi : language === 'zh' ? zh : en;

export function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return Boolean(value.trim());
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.some(hasValue);
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if ('disclosureStatus' in record) return record.disclosureStatus === 'not_disclosed' || (record.disclosureStatus === 'public' && hasValue(record.value));
    if ('vi' in record || 'en' in record) return [record.vi, record.en, record.zh].some(hasValue);
    return Object.values(record).some(hasValue);
  }
  return true;
}

export const safeUrl = (url?: string) => Boolean(url && /^https?:\/\//i.test(url.trim()));
export const absentValue: SourcedValue<unknown> = { value: null, disclosureStatus: 'not_available', verificationStatus: 'unverified' };

export function StatePanel({ title, text, kind = 'empty', action, secondary }: {
  title: string; text: string; kind?: 'empty' | 'no_results' | 'error' | 'loading' | 'forbidden' | 'not_found';
  action?: ReactNode; secondary?: ReactNode;
}) {
  const Icon = kind === 'loading' ? LoaderCircle : kind === 'forbidden' ? ShieldAlert : kind === 'error' ? Info : FileSearch;
  return <div className={`state-panel state-${kind}`} role={kind === 'error' ? 'alert' : 'status'} aria-busy={kind === 'loading'}>
    <Icon className="state-icon" aria-hidden="true" />
    <div className="state-message"><h3>{title}</h3><p>{text}</p>
      {kind !== 'loading' && (action || secondary) && <div className="state-actions">{action}{secondary}</div>}
    </div>
  </div>;
}

export function SafeImage({ src, alt, className = '' }: { src?: string; alt: string; className?: string }) {
  const { language } = useApp();
  const [failedSrc, setFailedSrc] = useState<string>();
  return src?.trim() && failedSrc !== src ? <img className={className} src={src} alt={alt} onError={() => setFailedSrc(src)} /> :
    <div className={`image-fallback ${className}`} role="img" aria-label={emptyCopy(language,'Chưa có hình ảnh được công bố','No published image','暂无公开图片')}>
      <ImageOff aria-hidden="true" /><span>{emptyCopy(language,'Chưa có hình ảnh được công bố','No published image','暂无公开图片')}</span>
    </div>;
}

export interface DisplayFact { label: string; value?: unknown; source?: SourcedValue<unknown>; unit?: string }
export function FactGroup({ facts, className = '' }: { facts: DisplayFact[]; className?: string }) {
  const { language } = useApp();
  const missing = facts.filter(f => !hasValue(f.source ?? f.value));
  const visible = facts.filter(f => hasValue(f.source ?? f.value));
  return <div className={`adaptive-facts ${className}`}>
    {visible.map(f => <div className="adaptive-fact" key={f.label}><small>{f.label}</small><strong>{f.source ? displaySourced(f.source, language) : `${typeof f.value === 'number' ? f.value.toLocaleString(language === 'vi' ? 'vi-VN' : language === 'zh' ? 'zh-CN' : 'en-US') : f.value}${f.unit ? ` ${f.unit}` : ''}`}</strong>
      {f.source?.asOf && <small>{emptyCopy(language,'Cập nhật','As of','更新日期')}: {f.source.asOf}</small>}
      {f.source?.sourceDocumentId && <small>{emptyCopy(language,'Nguồn','Source','来源')}: {f.source.sourceDocumentId}</small>}
      {f.source && <small>{f.source.verificationStatus === 'verified' ? emptyCopy(language,'Đã xác minh','Verified','已核验') : f.source.verificationStatus === 'reviewed' ? emptyCopy(language,'Đã rà soát','Reviewed','已审阅') : emptyCopy(language,'Chưa xác minh','Unverified','未核验')}</small>}
      {f.source?.calculated && <small>{emptyCopy(language,'Được tính toán','Calculated','计算值')}</small>}
    </div>)}
    {missing.length > 0 && <div className="missing-summary"><Info size={17} aria-hidden="true" /><div><b>{emptyCopy(language,'Chưa có thông tin','Information not yet available','暂无资料')}</b><p>{missing.map(f => f.label).join(' · ')}</p></div></div>}
  </div>;
}

export function OptionalSection({ show, children, ...props }: { show: boolean; children: ReactNode; id?: string; className?: string }) {
  return show ? <section {...props}>{children}</section> : null;
}

export function DetailUnavailable({ to, label }: { to: string; label: string }) {
  const { language } = useApp();
  return <StatePanel kind="not_found" title={emptyCopy(language,'Không thể mở nội dung này','This content is unavailable','此内容暂不可用')}
    text={emptyCopy(language,'Nội dung không tồn tại hoặc chưa được công bố. Bạn có thể quay lại danh mục để tiếp tục tìm kiếm.','It may not exist or may not be published. Return to the directory to continue browsing.','内容可能不存在或尚未公开。请返回列表继续查找。')}
    action={<Link className="button primary" to={to}>{label}</Link>} />;
}
