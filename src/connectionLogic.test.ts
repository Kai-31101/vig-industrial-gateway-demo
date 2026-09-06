import {describe,it,expect} from 'vitest';
import {connectionMetrics,successfulConnection,validOutcome} from './connectionLogic';
import type {IndustrialRequest} from './types';
describe('Connection report semantics',()=>{
 it('rejects impossible confirmation dates, including in metrics',()=>{
  const outcome={result:'success' as const,note:'Confirmed',requesterConfirmed:true,partnerConfirmed:true,confirmedOn:'2026-02-31',recordedBy:'Admin'};
  expect(validOutcome(outcome)).toBe(false);
  expect(connectionMetrics([{id:'invalid',status:'closed',outcome} as IndustrialRequest]).success).toBe(0);
 });
 const r={id:'a',status:'closed',direction:'inbound'} as IndustrialRequest;
 it('never equates closed with successful',()=>{expect(successfulConnection(r)).toBeFalsy();expect(connectionMetrics([r]).success).toBe(0)});
 it('deduplicates and reports an empty denominator as unavailable',()=>{expect(connectionMetrics([r,r]).total).toBe(1);expect(connectionMetrics([]).rate).toBeNull()});
 it('requires explicit outcome and records unsuccessful separately',()=>{expect(validOutcome(undefined)).toBe(false);expect(validOutcome({result:'unsuccessful',note:'No suitable partner',requesterConfirmed:false,partnerConfirmed:false,confirmedOn:'',recordedBy:'Admin'})).toBe(true)});
});
