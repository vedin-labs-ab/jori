"""Rebuild outlined Geist Medium lettering. Requires fonttools and brotli."""

from pathlib import Path
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

root = Path(__file__).resolve().parents[2]
font = instantiateVariableFont(
    TTFont(root / "node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2"),
    {"wght": 500},
)
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
scale = 48 / font["head"].unitsPerEm
paths = []
cursor = 0
for letter in "Jori":
    glyph = glyphs[cmap[ord(letter)]]
    pen = SVGPathPen(glyphs, ntos=lambda value: str(round(value, 3)).rstrip("0").rstrip(".") if value % 1 else str(int(value)))
    glyph.draw(TransformPen(pen, (scale, 0, 0, -scale, cursor, 0)))
    bounds = BoundsPen(glyphs)
    glyph.draw(TransformPen(bounds, (scale, 0, 0, -scale, cursor, 0)))
    paths.append((pen.getCommands(), bounds.bounds))
    cursor += glyph.width * scale - 0.9

left = min(bounds[0] for _, bounds in paths)
top = min(bounds[1] for _, bounds in paths)
right = max(bounds[2] for _, bounds in paths)
bottom = max(bounds[3] for _, bounds in paths)
offset_x = round(65 - left, 3)
offset_y = round((52 - (bottom - top)) / 2 - top, 3)
width = round(65 + right - left, 3)
source = (
    "// Generated from Geist Medium, SIL OFL 1.1, by scripts/brand/lettering.py.\n"
    f"export const wordmarkWidth = {width}\n"
    f'export const wordmarkTransform = "translate({offset_x} {offset_y})"\n'
    "export const wordmarkPaths = [\n"
    + "".join(f'  "{data}",\n' for data, _ in paths)
    + "] as const\n"
)
(root / "src/shared/brand/lettering.ts").write_text(source)
