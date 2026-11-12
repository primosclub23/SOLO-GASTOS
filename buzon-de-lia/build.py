#!/usr/bin/env python3
"""Genera una copia de la maqueta en un solo archivo HTML (CSS y JS dentro).
Uso: python3 build.py salida.html"""
import re, sys, pathlib
d = pathlib.Path(__file__).parent
h = (d / 'index.html').read_text()
h = re.sub(r'<link rel="stylesheet" href="([\w.]+\.css)\?v=\w+">', lambda m: '<style>\n' + (d / m.group(1)).read_text() + '</style>', h)
h = re.sub(r'<script defer src="([\w.]+\.js)\?v=\w+"></script>', lambda m: '<script>\n' + (d / m.group(1)).read_text() + '</script>', h)
assert '.css?v=' not in h and '.js?v=' not in h
pathlib.Path(sys.argv[1]).write_text(h)
