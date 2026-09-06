// @vitest-environment jsdom
import {it,expect,vi,afterEach} from 'vitest';
import {renderHook,act,cleanup} from '@testing-library/react';
import {AppProvider,useApp} from './AppContext';
import {assets} from './data';
afterEach(()=>{cleanup();vi.useRealTimers()});
it('keeps asset context and retries the same failed message without a Connection',()=>{
 vi.useFakeTimers();const h=renderHook(()=>useApp(),{wrapper:AppProvider});const asset=assets[0],count=h.result.current.requests.length;
 act(()=>h.result.current.openParkChat(asset.parkId,asset.id));
 expect(h.result.current.chatThreads[asset.parkId].some(m=>m.assetId===asset.id)).toBe(true);
 act(()=>h.result.current.sendParkChatMessage('Xin thông tin nhà xưởng',true));
 const id=h.result.current.chatThreads[asset.parkId].at(-1)!.id;
 expect(h.result.current.chatThreads[asset.parkId].at(-1)?.status).toBe('sending');
 act(()=>vi.advanceTimersByTime(700));expect(h.result.current.chatThreads[asset.parkId].at(-1)?.status).toBe('failed');
 act(()=>{h.result.current.retryParkChatMessage(id);h.result.current.retryParkChatMessage(id)});
 act(()=>vi.advanceTimersByTime(700));
 expect(h.result.current.chatThreads[asset.parkId].filter(m=>m.id===id)).toHaveLength(1);
 expect(h.result.current.chatThreads[asset.parkId].at(-1)?.status).toBe('sent');
 expect(h.result.current.requests).toHaveLength(count);
});
