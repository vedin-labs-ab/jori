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
# The glyphs are outlined at 48 units, which the footer's cropped name is
# tuned to. The lockup scales them down to the site header's proportions,
# where a 16px name sits beside a 32px mark: half the mark's 52 units tall,
# a quarter of it away.
glyph_size = 48
mark = 52
gap = mark / 4
lockup = mark / 2 / glyph_size
scale = glyph_size / font["head"].unitsPerEm
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
offset_x = round(mark + gap - left * lockup, 3)
offset_y = round((mark - (bottom - top) * lockup) / 2 - top * lockup, 3)
width = round(mark + gap + (right - left) * lockup, 3)
source = (
    "// Generated from Geist Medium, SIL OFL 1.1, by scripts/brand/lettering.py.\n"
    f"export const wordmarkWidth = {width}\n"
    f'export const wordmarkTransform = "translate({offset_x} {offset_y}) scale({round(lockup, 5)})"\n'
    "export const wordmarkPaths = [\n"
    + "".join(f'  "{data}",\n' for data, _ in paths)
    + "] as const\n"
)
(root / "src/shared/brand/lettering.ts").write_text(source)
