"""Verifica sintaxe JS, JSON, referências locais e IDs HTML. Só usa a biblioteca padrão."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
from collections import Counter
import json
import subprocess
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
errors = []
class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.links = []
        self.scripts = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        for key in ('src', 'href'):
            if attrs.get(key):
                self.links.append(attrs[key])
        if tag == 'script' and attrs.get('src'):
            self.scripts.append(attrs['src'])

pages = list((ROOT / 'frontend').glob('*.html'))
for path in pages:
    page = Page()
    page.feed(path.read_text(encoding='utf-8'))
    for key, count in Counter(page.ids).items():
        if count > 1:
            errors.append(f'{path.name}: ID repetido: {key}')
    for value in page.links:
        url = urlsplit(value)
        if not url.scheme and not url.netloc and url.path and not (path.parent / unquote(url.path)).exists():
            errors.append(f'{path.name}: arquivo ausente: {value}')
    local = [s for s in page.scripts if not urlsplit(s).scheme]
    if local[:2] != ['js/config.js', 'js/sfx-core.js']:
        errors.append(f'{path.name}: configuração e sessão precisam preceder os scripts da página')
scripts = list((ROOT / 'frontend/js').glob('*.js'))
for path in scripts:
    result = subprocess.run(['node', '--check', str(path)], text=True, capture_output=True)
    if result.returncode:
        errors.append(result.stderr)
for path in (ROOT / 'SmartFixApi').rglob('*.json'):
    json.loads(path.read_text(encoding='utf-8'))
for path in ROOT.rglob('*.csproj'):
    ET.parse(path)
if errors:
    print('\n'.join(errors))
    sys.exit(1)
print(f'OK: {len(pages)} páginas, {len(scripts)} scripts, JSON e projetos XML válidos.')
print('Esta verificação não compila C#, não executa SQL e não substitui teste em navegador.')
