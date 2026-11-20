"""Frames (PNG) -> a small looping animated WebP for the README (full color; GIF's 256-color palettes shifted
button colors). Usage: python3 scripts/anim.py <frames dir> <out.webp>"""
import sys, glob
from PIL import Image
frames = [Image.open(f).convert('RGB') for f in sorted(glob.glob(sys.argv[1] + '/*.png'))]
w = 720
frames = [f.resize((w, round(f.height * w / f.width)), Image.LANCZOS) for f in frames]
frames[0].save(sys.argv[2], save_all=True, append_images=frames[1:], duration=[400] * 4 + [140] * (len(frames) - 4), loop=0, quality=72, method=6)
