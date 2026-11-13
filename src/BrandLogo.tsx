export function BrandLogo({compact=false}:{compact?:boolean}) {
  return <div className={`vsip-brand${compact ? ' vsip-brand-compact' : ''}`}><i className="vsip-logo-window"><img src="/images/vsip-logo.webp" alt="VSIP" /></i><small className="vsip-demo-pill">Demo</small></div>;
}
