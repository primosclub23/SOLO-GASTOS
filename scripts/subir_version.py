#!/usr/bin/env python3
"""Sube la versión de la app en los dos sitios a la vez: VERSION en sw.js y «versión N» en Ajustes (index.html).
Uso: python3 scripts/subir_version.py          (sube 1)
     python3 scripts/subir_version.py --check  (solo comprueba que ambos coinciden)"""
import re, sys, pathlib

raíz = pathlib.Path(__file__).resolve().parent.parent
sw, ix = raíz / 'sw.js', raíz / 'index.html'
t_sw, t_ix = sw.read_text(encoding='utf-8'), ix.read_text(encoding='utf-8')
m_sw = re.search(r"VERSION = 'sg-v(\d+)'", t_sw)
m_ix = re.search(r"Solo Gastos · versión (\d+)", t_ix)
if not m_sw or not m_ix:
    sys.exit('No encuentro la versión en sw.js o en index.html.')
a, b = int(m_sw.group(1)), int(m_ix.group(1))
if a != b:
    sys.exit(f'Las versiones no coinciden: sw.js={a}, Ajustes={b}. Arréglalo a mano y vuelve a ejecutar.')
if '--check' in sys.argv:
    print(f'OK: versión {a} en los dos sitios.'); sys.exit(0)
n = a + 1
sw.write_text(t_sw.replace(m_sw.group(0), f"VERSION = 'sg-v{n}'"), encoding='utf-8')
ix.write_text(t_ix.replace(m_ix.group(0), f"Solo Gastos · versión {n}"), encoding='utf-8')
print(f'Versión {a} → {n} (sw.js e index.html).')
