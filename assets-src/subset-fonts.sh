#!/bin/sh
# Subsets the variable fonts to the characters the app uses (Basic Latin plus a few symbols) and the layout
# features it needs. Needs fonttools + brotli:  pip install fonttools brotli   then   sh assets-src/subset-fonts.sh
# Other symbols (arrows, Ω, ≤ …) fall back to the system font, as they are not in these fonts at all.
set -e
cd "$(dirname "$0")"
for f in inter montserrat; do
  pyftsubset "fonts/$f-latin-wght-normal.woff2" \
    --unicodes="U+0020-007E,U+00A0,U+00B0-00B3,U+00B5,U+00B7,U+00BC-00BE,U+00D7,U+00D8,U+00E9,U+00F7,U+2013,U+2014,U+2018,U+2019,U+201C,U+201D,U+2022,U+2026,U+2212" \
    --layout-features="kern,tnum,liga,calt,ccmp,locl,mark,mkmk" \
    --flavor=woff2 --output-file="../public/fonts/$f-sub.woff2"
done
ls -la ../public/fonts/*.woff2
