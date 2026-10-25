# Sources

Retrieved from the public page https://vuolie.ru/#genplan on 2026-10-17. Files downloaded unchanged.
All rights remain with the original rightsholders; no license is granted by this repository.

- `assets/hero.jpeg`: https://static.tildacdn.com/tild3538-3237-4230-a364-333539626233/DSCF5995_2__.jpeg
- `assets/lake.jpeg`: https://static.tildacdn.com/tild3165-6362-4364-a336-356238346365/DSCF5936.jpeg
- `assets/forest.jpeg`: https://static.tildacdn.com/tild3230-3734-4265-a630-386531373131/DSCF5942_1.jpeg
- `assets/shore.jpeg`: https://static.tildacdn.com/tild6135-6661-4163-b039-663763313635/DSCF5993_1___3.jpeg
- `assets/logo.svg`: https://static.tildacdn.com/tild3563-3835-4263-b262-333632366433/Logo.svg (знак из шапки vuolie.ru)
- `assets/masterplan.webp`: background image used by the official masterplan SVG
  (https://xn------dddcblgdajxc3eibqmgpr.xn--p1ai/wp-content/uploads/2026/01/map4-scaled.webp).
- `assets/plots.json`: 233 plot IDs, polygon coordinates and areas from the public inline masterplan data
  (coordinate space 3686.1 × 2326.85). No geometry invented.

## Price snapshot (17.10.2026)

The public masterplan data contained 187 numeric per-plot prices (RUB) and 46 sold plot IDs; every plot is
in exactly one of the two sets. These values are embedded in `app.js`. Price per sotka is a calculation
(total / area). Sold plots show "Цена по запросу". The snapshot is not updated automatically.

Plot 78 is listed at 210 000 ₽ in the source (likely 2 100 000 ₽); it is preserved as published, flagged in the UI
and excluded from the advertised minimum and from narrowed budget results.

- `assets/hero.mp4`, `assets/hero-poster.jpg`: AI-generated (Grok Imagine Video 1.5 Lite via OpenRouter) from owner-provided renders, 26.10.2026.
- `assets/leaflet/`: Leaflet 1.9.4 (BSD-2). Map imagery: Esri World Imagery (attribution shown).
- `assets/three/`: three.js r169 (MIT). `assets/model3d.js`: 3D model built from plots.json geometry; houses/trees are illustrative.
- `assets/route-spb.json`: driving route St Petersburg centre → village, OSRM demo (OpenStreetMap data), simplified.
