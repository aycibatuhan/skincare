#!/usr/bin/env python3
"""Skincare — tek dosyalık dağıtım üretir:
  dist/skincare.html     → tam sayfa, çevrimdışı açılabilir (Dosyalar'dan Safari ile aç, ana ekrana ekle)
"""
import os, re
root = os.path.dirname(os.path.abspath(__file__))
rd = lambda f: open(os.path.join(root, f), encoding='utf-8').read()
html, css, data, app = rd('index.html'), rd('styles.css'), rd('data.js'), rd('i18n.js') + '\n' + rd('app.js')
import base64 as _b64
icon_uri = 'data:image/png;base64,' + _b64.b64encode(open(os.path.join(root, 'icon-180.png'), 'rb').read()).decode()

head_script = re.search(r'(<script>\s*/\* İlk boyamadan.*?</script>)', html, re.S).group(1)
body = re.search(r'<body>(.*)</body>', html, re.S).group(1)
body = body.replace('<script src="data.js"></script>', '').replace('<script src="i18n.js"></script>', '').replace('<script src="app.js"></script>', '')
# Görselleri data URI olarak göm
import base64, mimetypes
for m in re.finditer(r"'(img/([a-z_]+)\.(png|jpg|svg))'", data):
    p = os.path.join(root, m.group(1))
    if os.path.exists(p):
        mime = {'png': 'image/png', 'jpg': 'image/jpeg', 'svg': 'image/svg+xml'}[m.group(3)]
        uri = 'data:' + mime + ';base64,' + base64.b64encode(open(p, 'rb').read()).decode()
        data = data.replace(m.group(0), "'" + uri + "'")
inline_js = '<script>\n' + data + '\n' + app + '\n</script>'
os.makedirs(os.path.join(root, 'dist'), exist_ok=True)

full = f"""<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#70702E">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Skincare">
<link rel="icon" href="{icon_uri}">
<link rel="apple-touch-icon" href="{icon_uri}">
<title>Skincare</title>
{head_script}
<style>
{css}
</style>
</head>
<body>{body}{inline_js}
</body>
</html>
"""
open(os.path.join(root, 'dist', 'skincare.html'), 'w', encoding='utf-8').write(full)
print('dist/skincare.html', len(full), 'bytes')
