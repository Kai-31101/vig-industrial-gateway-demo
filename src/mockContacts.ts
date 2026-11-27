/**
 * Presentation correction for generated placeholder contacts (vig.example -> vsip.example).
 *
 * Only the exact generated placeholders change:
 *  - park contact email  ^contact<digits>@vig.example$  -> contact<digits>@vsip.example
 *  - park contact website exactly "vig.example"          -> "vsip.example"
 *  - the six seeded demo identities, matched by user id AND exact old address.
 * Everything else (real addresses, arbitrary user-entered @vig.example values, phones, ids,
 * revisions, provenance, unrelated fields) is returned untouched. Records that need no change are
 * returned as the same object (identity), so callers can cheaply detect "no change".
 * The functions are null-safe and idempotent; stored rows are corrected on read, never rewritten.
 */
const MOCK_EMAIL = /^contact([0-9]+)@vig\.example$/;
const MOCK_WEBSITE = 'vig.example';

export function normalizeMockContact<T>(record: T): T {
  if (!record || typeof record !== 'object') return record;
  const contact = (record as { contact?: unknown }).contact;
  if (!contact || typeof contact !== 'object' || Array.isArray(contact)) return record;
  const c = contact as { email?: unknown; website?: unknown };
  const email = typeof c.email === 'string' && MOCK_EMAIL.test(c.email) ? c.email.replace(MOCK_EMAIL, 'contact$1@vsip.example') : undefined;
  const website = c.website === MOCK_WEBSITE ? 'vsip.example' : undefined;
  if (email === undefined && website === undefined) return record;
  return { ...record, contact: { ...contact, ...(email !== undefined ? { email } : {}), ...(website !== undefined ? { website } : {}) } };
}

export function normalizeMockContacts<T>(records: T[]): T[] {
  if (!Array.isArray(records)) return records;
  let changed = false;
  const next = records.map(r => { const n = normalizeMockContact(r); if (n !== r) changed = true; return n; });
  return changed ? next : records;
}

/** Draft-shaped records ({data, published?}) used by the admin store and local snapshots. */
export function normalizeDraftContacts<T extends { data?: unknown; published?: unknown }>(draft: T): T {
  if (!draft || typeof draft !== 'object') return draft;
  const data = normalizeMockContact(draft.data), published = normalizeMockContact(draft.published);
  if (data === draft.data && published === draft.published) return draft;
  return { ...draft, data, ...(draft.published !== undefined ? { published } : {}) };
}

export function normalizeDraftsContacts<T extends { data?: unknown; published?: unknown }>(drafts: T[]): T[] {
  if (!Array.isArray(drafts)) return drafts;
  let changed = false;
  const next = drafts.map(d => { const n = normalizeDraftContacts(d); if (n !== d) changed = true; return n; });
  return changed ? next : drafts;
}

/** Seeded demo identities: id -> [old address, new address]. Never applied to any other user. */
export const DEMO_IDENTITY_RENAMES: Record<string, [string, string]> = {
  sa: ['superadmin@vig.example', 'superadmin@vsip.example'],
  admin: ['admin@vig.example', 'admin@vsip.example'],
  operator: ['operator@vig.example', 'operator@vsip.example'],
  existing: ['existing@vig.example', 'existing@vsip.example'],
  pending: ['invited@vig.example', 'invited@vsip.example'],
  expired: ['expired@vig.example', 'expired@vsip.example'],
};

export function normalizeDemoIdentities<T extends { id?: unknown; email?: unknown }>(users: T[]): T[] {
  if (!Array.isArray(users)) return users;
  let changed = false;
  const next = users.map(u => {
    const pair = u && typeof u.id === 'string' ? DEMO_IDENTITY_RENAMES[u.id] : undefined;
    if (!pair || u.email !== pair[0]) return u;
    changed = true; return { ...u, email: pair[1] };
  });
  return changed ? next : users;
}

/** Local demo login only: an old seeded address resolves to its renamed address. Other input is unchanged. */
export function demoLoginAlias(address: string): string {
  for (const [oldAddress, newAddress] of Object.values(DEMO_IDENTITY_RENAMES)) if (address === oldAddress) return newAddress;
  return address;
}
