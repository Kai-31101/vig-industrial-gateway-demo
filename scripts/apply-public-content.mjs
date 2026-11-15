import {structuralErrors} from '../src/contentSchema.ts';
import {readFileSync,writeFileSync} from 'node:fs';
const file=process.argv[2];if(!file)throw Error('Usage: node scripts/apply-public-content.mjs <publishedContent.json>');
const data=JSON.parse(readFileSync(file,'utf8').replace(/^\uFEFF/,''));
if(data.version!==1||data.mode!=='replace'||!Array.isArray(data.parks)||!Array.isArray(data.assets))throw Error('Unsupported public bundle');
for(const item of [...data.parks,...data.assets])if(Object.keys(structuralErrors(item)).length)throw Error('Invalid units, pricing or masterplan');
const ids=new Set(),slugs=new Set();
for(const p of data.parks){if(!p.id||ids.has(p.id)||!p.slug||slugs.has(p.slug)||p.publicationStatus!=='published'||!p.name?.vi||!p.name?.en||!p.name?.zh)throw Error('Invalid park identity');ids.add(p.id);slugs.add(p.slug);if(!Array.isArray(p.documents)||p.documents.some(d=>d.visibility!=='public'))throw Error('Restricted documents in public bundle');}
for(const a of data.assets){if(!a.id||ids.has(a.id)||!data.parks.some(p=>p.id===a.parkId)||a.transaction!=='lease'||!(a.area>0)||!['ha','m²'].includes(a.unit))throw Error('Invalid asset');ids.add(a.id);}
function inspect(v){if(!v||typeof v!=='object')return;for(const [k,x] of Object.entries(v)){if(['drafts','audit','users','invites','password','token','matrix','__proto__','constructor'].includes(k))throw Error('Non-public field: '+k);inspect(x);}}
inspect(data);writeFileSync(new URL('../src/publishedContent.json',import.meta.url),JSON.stringify(data,null,2)+'\n');console.log(`Prepared ${data.parks.length} parks and ${data.assets.length} assets. Run build/tests, then deploy. No deployment performed.`);
