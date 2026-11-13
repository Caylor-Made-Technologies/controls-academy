# Assets and licenses

| Asset | Source | License |
|---|---|---|
| App icon, favicon, maskable icon | Original SVG, `assets-src/icon.svg` | Caylor Made Technologies |
| CM monogram (`public/brand/logo-mark.png`) | Caylor Made Technologies logo | Caylor Made Technologies |
| Inter font | Self-hosted woff2, subset to the characters the app uses (`assets-src/subset-fonts.sh`; full file in `assets-src/fonts/`) | SIL OFL 1.1 (`public/fonts/Inter-OFL.txt`) |
| Montserrat font | Self-hosted woff2, subset the same way | SIL OFL 1.1 (`public/fonts/Montserrat-OFL.txt`) |
| Machine, ladder and figure graphics | Inline SVG drawn in code | Original |
| Sounds | Generated at runtime with Web Audio | Original |
| 3D control panel, operator station, motor | Procedural three.js geometry in `src/three/PanelScene.tsx` (no model files) | Original |
| 3D labels, glow halos, brushed-metal texture | Drawn on canvas at runtime (`src/three/textures.ts`) | Original |
| 3D lighting | drei `Lightformer` environment built in code (no HDR download) | Original |
