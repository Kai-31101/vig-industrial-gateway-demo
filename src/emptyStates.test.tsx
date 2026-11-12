// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { AppProvider } from './AppContext';
import { FactGroup, SafeImage, StatePanel, hasValue } from './EmptyStates';
import { displaySourced } from './logic';
import { previewPark } from './emptyPreview';
import { vsipThaiBinh } from './data';

afterEach(cleanup);
const wrapper = ({children}:{children:React.ReactNode}) => <AppProvider><MemoryRouter>{children}</MemoryRouter></AppProvider>;
describe('absence and disclosure',()=>{
  it('keeps real zero/false but rejects blank and non-finite numbers',()=>{
    expect([0,false,'valid'].every(hasValue)).toBe(true);
    expect([null,undefined,'  ',NaN,[],{vi:'',en:''}].some(hasValue)).toBe(false);
  });
  it('retains a disclosure state without exposing its value',()=>{
    const secret={value:987654,unit:'USD',disclosureStatus:'not_disclosed' as const,verificationStatus:'verified' as const};
    expect(hasValue(secret)).toBe(true);
    render(<FactGroup facts={[{label:'Price',source:secret}]}/>,{wrapper});
    expect(screen.getByText('Không công bố')).toBeTruthy();
    expect(screen.queryByText(/987654/)).toBeNull();
  });
  it('groups multiple missing fields once and keeps useful facts',()=>{
    render(<FactGroup facts={[{label:'Area',value:0,unit:'ha'},{label:'Power',value:undefined,unit:'MVA'},{label:'Date',value:''}]}/>,{wrapper});
    expect(screen.getByText('0 ha')).toBeTruthy();
    expect(screen.getAllByText('Chưa có thông tin')).toHaveLength(1);
    expect(screen.getByText('Power · Date')).toBeTruthy();
    expect(screen.queryByText(/MVA/)).toBeNull();
  });
  it('does not render undefined or blank units through sourced values',()=>{
    expect(displaySourced({value:undefined,unit:'MVA',disclosureStatus:'public'},'en')).toBe('Not available');
    expect(displaySourced({value:'  ',unit:'MVA',disclosureStatus:'public'},'en')).toBe('Not available');
  });
  it('uses a neutral fallback after image load failure',()=>{
    render(<SafeImage src='/broken.jpg' alt='Site' />,{wrapper});
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByText('Chưa có hình ảnh được công bố')).toBeTruthy();
    expect(screen.queryByAltText('Site')).toBeNull();
  });
  it('does not mutate real park fixtures to demonstrate sparse content',()=>{
    const before=JSON.stringify(vsipThaiBinh);
    expect(previewPark(vsipThaiBinh,'minimal').availability).toHaveLength(0);
    expect(JSON.stringify(vsipThaiBinh)).toBe(before);
  });
});
describe('implemented UI flows',()=>{
  it('opens a sparse profile without an availability/phase crash and removes empty sections/nav',()=>{
    window.location.hash='#/industrial-parks/vsip-thai-binh?demoState=minimal';
    render(<App/>);
    expect(screen.getByRole('heading',{name:'KCN minh họa — Hồ sơ đang bổ sung'})).toBeTruthy();
    expect(screen.queryByRole('heading',{name:'Ưu đãi đầu tư'})).toBeNull();
    expect(screen.queryByRole('button',{name:/Nhân lực/})).toBeNull();
    expect(screen.queryByRole('heading',{name:'Mức lương tham khảo'})).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:/Tài sản 0/}));
    expect(screen.getByText('Chưa có sản phẩm được công bố')).toBeTruthy();
    expect(screen.getAllByRole('link',{name:'Tìm mặt bằng'}).some(a=>a.getAttribute('href')?.includes('parkId='))).toBe(true);
  });
  it('handles an asset whose park is unavailable without a direct supplier CTA',()=>{
    window.location.hash='#/assets/asset-1?demoState=orphan';
    render(<App/>);
    expect(screen.getByText(/Chưa xác định được KCN liên kết/)).toBeTruthy();
    expect(screen.queryByRole('button',{name:'Trao đổi với KCN'})).toBeNull();
    expect(screen.queryByRole('link',{name:'Gửi yêu cầu trực tiếp'})).toBeNull();
  });
  it('keeps absent assets in an explicit recovery screen instead of silent navigation',()=>{
    window.location.hash='#/assets/not-found';render(<App/>);
    expect(screen.getByRole('heading',{name:'Không thể mở nội dung này'})).toBeTruthy();
    expect(window.location.pathname).toBe('/assets/not-found');
  });
  it('resets park filters using the empty-state action',()=>{
    window.location.hash='#/industrial-parks';render(<App/>);
    fireEvent.change(screen.getByPlaceholderText(/Tìm theo tên khu công nghiệp/),{target:{value:'no-such-park-000'}});
    expect(screen.getByText('Không tìm thấy khu công nghiệp phù hợp')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button',{name:'Xóa bộ lọc'}).at(-1)!);
    expect(screen.queryByText('Không tìm thấy khu công nghiệp phù hợp')).toBeNull();
    expect(screen.getByPlaceholderText(/Tìm theo tên khu công nghiệp/).getAttribute('value')).toBe('');
  });
  it('makes loading non-actionable and errors actionable',()=>{
    const {rerender}=render(<StatePanel kind='loading' title='Loading' text='Wait' action={<button>Retry</button>}/>);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByRole('status').getAttribute('aria-busy')).toBe('true');
    rerender(<StatePanel kind='error' title='Error' text='Try again' action={<button>Retry</button>}/>);
    expect(screen.getByRole('alert')).toBeTruthy();expect(screen.getByRole('button',{name:'Retry'})).toBeTruthy();
  });
});
