import {describe,it,expect} from 'vitest';
import {parks} from './data';
import records from './vsipStatuses.json';

describe('sourced park operating status',()=>{
  it('covers every project exactly once with public evidence and separate dates',()=>{
    expect(records.map(r=>r.slug).sort()).toEqual(parks.map(p=>p.slug).sort());
    expect(new Set(records.map(r=>r.slug)).size).toBe(records.length);
    for(const park of parks){
      const evidence=park.statusEvidence!;
      expect(evidence.checkedAt).toBe('2026-11-12');
      const doc=park.documents.find(d=>d.id===evidence.sourceDocumentId)!;
      expect(doc.visibility).toBe('public');
      expect(doc.sourceUrl).toMatch(/^https:\/\//);
      expect(doc.issueDate).toBe(evidence.sourceDate);
      expect(evidence.note.vi.length).toBeGreaterThan(30);
      expect(evidence.note.en.length).toBeGreaterThan(30);
    }
  });
  it('does not propagate operation to a different numbered park or convert schedules to completion',()=>{
    const status=(slug:string)=>parks.find(p=>p.slug===slug)!.status;
    expect(status('vsip-hai-phong-i')).toBe('operational');
    expect(status('vsip-hai-phong-ii')).toBe('planned');
    expect(status('vsip-nghe-an-i')).toBe('operational');
    expect(status('vsip-nghe-an-ii')).toBe('developing');
    expect(status('vsip-nghe-an-iii')).toBe('planned');
    expect(status('vsip-nghe-an-iv')).toBe('planned');
    expect(status('vsip-quang-ngai-i')).toBe('operational');
    expect(status('vsip-quang-ngai-ii')).toBe('developing');
    expect(status('vsip-bac-ninh-ii')).toBe('developing');
  });
  it('identifies partial operation without asserting full infrastructure completion',()=>{
    const park=parks.find(p=>p.slug==='vsip-can-tho')!;
    expect(park.status).toBe('operational');
    expect(park.statusEvidence?.note.en).toContain('Partially operational');
    expect(park.statusEvidence?.sourceDate).toBe('2026-09-19');
    expect(parks.find(p=>p.slug==='quang-tri-international-industrial-park-qtip')!.statusEvidence?.sourceDate).toBeUndefined();
  });
});
