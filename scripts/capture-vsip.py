"""Capture public VSIP project facts. Run manually; never infer commercial inventory."""
import json, urllib.request, concurrent.futures, sys
sys.stdout.reconfigure(encoding="utf-8")
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
INDEX='https://www.vsip.com.vn/en/projects/'
def soup(url):
    return BeautifulSoup(urllib.request.urlopen(url, timeout=40).read(), 'html.parser')
s=soup(INDEX)
links=list(dict.fromkeys(a['href'] for a in s.select('a[href]') if '/en/project/' in a['href']))
def capture(url):
    doc=soup(url)
    name=doc.h1.get_text(' ',strip=True)
    fields={}
    for label in ['Total Area','Province / City','Established']:
        t=doc.find(string=lambda x: x and x.strip()==label)
        if t: fields[label]=t.parent.parent.get_text(' ',strip=True).removeprefix(label).strip()
    t=doc.find(string=lambda x:x and x.strip()=='Available Land')
    # Prefer the paired overview table, not the highlight cards.
    for t in doc.find_all(string=lambda x:x and x.strip()=='Available Land'):
        grid=t.parent.parent.parent
        if 'grid-cols-2' in grid.get('class',[]):
            cells=grid.find_all('div',recursive=False)
            for i in range(0,len(cells)-1,2): fields[cells[i].get_text(' ',strip=True)]=cells[i+1].get_text(' ',strip=True)
    imgs=list(dict.fromkeys(i.get('src') for i in doc.find_all('img') if ' '.join(i.get('alt','').split())==' '.join(name.split()) and i.get('src')))
    return {'name':name,'url':url,'retrievedAt':'2026-11-12','fields':fields,'images':imgs[:3]}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool: records=list(pool.map(capture,links))
(ROOT/'docs/data-sources/vsip-public-facts-2026-11-12.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
for r in records: print(r['name'],json.dumps(r['fields'],ensure_ascii=False),len(r['images']))
