import type { IndustrialParkProfile, ParkStatus } from './types';
import records from './vsipStatuses.json';

// A published milestone supports the classification, not certification of every phase.
export function applyVsipStatuses(parks: IndustrialParkProfile[]) {
  for (const row of records) {
    const park = parks.find(p => p.slug === row.slug);
    if (!park) throw new Error(`Unknown status project: ${row.slug}`);
    const id = `status-${row.slug}`;
    park.status = row.status as ParkStatus;
    park.statusEvidence = {
      sourceDocumentId: id, sourceDate: row.sourceDate || undefined,
      checkedAt: '2026-11-12', note: row.note,
    };
    park.documents.push({
      id, title: {vi: 'Nguồn trạng thái hoạt động', en: 'Operating status source', zh: '运营状态来源'},
      category: 'presentation', issuer: {vi: row.issuer, en: row.issuer},
      language: 'multi', visibility: 'public', verificationStatus: 'reviewed',
      sourceUrl: row.sourceUrl, issueDate: row.sourceDate || undefined,
    });
  }
}
