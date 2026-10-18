import re, json, base64, io, urllib.request, urllib.error
from pathlib import Path
# Uso: python3 scripts/mklogos.py  (necesita Pillow y red). Regenera logos.js a partir de BRANDS en index.html.
ROOT = Path(__file__).resolve().parent.parent
from PIL import Image
P=ROOT/'index.html'
s=open(P,encoding='utf-8').read()
b=s[s.index("const BRANDS = {"):s.index("const BRAND_KEYS")]
doms=sorted(set(re.findall(r"'[^']+':'([a-z0-9.\-]+)'",b)))
print(len(doms),'dominios')
def get(u):
    try:
        with urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'}),timeout=20) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e: return e.code, b''
    except Exception as e: return 0, b''
SI_OVER={'max.com':'hbomax','steampowered.com':'steam','bancosantander.es':'santander','glovoapp.com':'glovo','just-eat.es':'justeat','gemini.google.com':'googlegemini','one.google.com':'google'}
def slug(d):
    if d in SI_OVER: return SI_OVER[d]
    p=d.split('.'); return re.sub(r'[^a-z0-9]','',p[-2] if len(p)>2 else p[0])
out={}; skipped=[]
for d in doms:
    st,_=get(f'https://cdn.jsdelivr.net/npm/simple-icons@13.21.0/icons/{slug(d)}.svg')
    if st==200: skipped.append(d); continue
    st,data=get(f'https://www.google.com/s2/favicons?domain={d}&sz=128')
    if st!=200 or len(data)<200: print('sin icono',d,st,len(data)); continue
    try:
        im=Image.open(io.BytesIO(data)).convert('RGBA')
    except Exception as e: print('no imagen',d); continue
    if im.size[0]<=16: print('muy pequeño',d,im.size); continue
    if im.size[0]>64: im=im.resize((64,64),Image.LANCZOS)
    buf=io.BytesIO(); im.save(buf,'PNG',optimize=True)
    out[d]='data:image/png;base64,'+base64.b64encode(buf.getvalue()).decode()
print('incrustados',len(out),'| cubiertos por Simple Icons',len(skipped))
js='/* Logos de marcas incrustados (favicons de las webs, ≤64 px). Se generan con scripts/mklogos.py; se usan sin red cuando Simple Icons no tiene la marca. */\nwindow.LOGOS='+json.dumps(out,separators=(',',':'))+';\n'
(ROOT/'logos.js').write_text(js,encoding='utf-8')
print('logos.js',len(js)//1024,'KB'); print('repsol.es' in out, 'mercadona.es' in out)
