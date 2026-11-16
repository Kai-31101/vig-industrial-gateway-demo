// @vitest-environment jsdom
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {AppProvider} from './AppContext';
import {AiChat} from './AiChat';
import {api} from './remote';
vi.mock('./remote',()=>({remoteEnabled:false,ensureSession:vi.fn().mockResolvedValue({}),api:vi.fn().mockResolvedValue({text:'Verified response',sources:[]})}));
beforeEach(()=>{localStorage.clear();vi.clearAllMocks()});afterEach(cleanup);
describe('AI management task routing',()=>{
 it.each([['Tổng hợp yêu cầu mới và tiến độ xử lý','statistics'],['Matching khách hàng với mặt bằng phù hợp','match']])('routes %s explicitly',async(label,taskHint)=>{render(<AppProvider><MemoryRouter><AiChat scope="admin" embedded/></MemoryRouter></AppProvider>);fireEvent.click(screen.getByRole('button',{name:label}));await waitFor(()=>expect(api).toHaveBeenCalledWith('ai/admin',expect.objectContaining({taskHint})));await screen.findAllByText('Verified response')});
});
