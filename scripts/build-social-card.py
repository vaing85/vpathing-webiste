"""
Builds assets/social-card.svg — the 1200x630 link-preview card — from the VPE
brand kit, with the IBM Plex Mono wordmark converted to vector paths.

Why paths instead of <text>: the card is rasterised by sharp/librsvg, which
resolves fonts from the system font list and cannot read our self-hosted
.woff2. A <text font-family="IBM Plex Mono"> would quietly render as Courier
anywhere Plex isn't installed. Outlines remove the font dependency entirely.

Usage:  python scripts/build-social-card.py
Deps:   pip install fonttools brotli
"""
import io
import os

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = os.path.join(ROOT, "assets", "fonts")
OUT = os.path.join(ROOT, "assets", "social-card.svg")

# ---- Brand constants (assets/brand/) ----
INK = "#0b1220"
BLUE_BRIGHT = "#4C86FF"  # dark-background gradient start
CYAN = "#22D3EE"
WHITE = "#ffffff"
MUTED = "#9fb0c8"

# The VPE mark, exactly as shipped in vpe-mark-gradient-bright.svg (viewBox 124x90)
MARK_STROKES = [
    "M8,12 L36,80 L64,12",
    "M64,12 L64,80",
    "M64,12 C87,12 87,44 64,44",
    "M89,12 L89,80",
    "M89,12 L110,12 M89,46 L107,46 M89,80 L110,80",
]


def text_to_paths(text, weight, font_size, x, y, letter_spacing=0.0):
    """Return (svg_path_data, advance_width) for `text` set in IBM Plex Mono."""
    font_path = os.path.join(FONTS, "ibm-plex-mono-latin-%d-normal.woff2" % weight)
    font = TTFont(font_path)
    upem = font["head"].unitsPerEm
    scale = float(font_size) / upem
    cmap = font.getBestCmap()
    glyphset = font.getGlyphSet()
    hmtx = font["hmtx"]

    parts = []
    pen_x = float(x)
    for ch in text:
        glyph_name = cmap.get(ord(ch))
        if glyph_name is None:
            continue
        pen = SVGPathPen(glyphset)
        glyphset[glyph_name].draw(pen)
        d = pen.getCommands()
        advance = hmtx[glyph_name][0] * scale
        if d:
            # Flip Y (font space is y-up, SVG is y-down) and place at the pen.
            parts.append(
                '<path d="%s" transform="translate(%.3f,%.3f) scale(%.6f,%.6f)"/>'
                % (d, pen_x, float(y), scale, -scale)
            )
        pen_x += advance + letter_spacing
    font.close()
    return "".join(parts), pen_x - float(x) - letter_spacing


def build():
    W, H = 1200, 630

    # --- Wordmark geometry ---
    name_size = 92.0
    sub_size = 26.0
    sub_spacing = 5.6

    name_a, name_w_a = text_to_paths("vpathing", 600, name_size, 0, 0)
    slash, slash_w = text_to_paths("/", 600, name_size, name_w_a, 0)
    name_w = name_w_a + slash_w
    sub, sub_w = text_to_paths(
        "enterprise_llc", 400, sub_size, 0, 0, letter_spacing=sub_spacing
    )

    mark_scale = 1.55
    mark_w = 124 * mark_scale
    mark_h = 90 * mark_scale
    gap = 40.0

    block_w = mark_w + gap + name_w
    block_x = (W - block_w) / 2.0
    center_y = H / 2.0 - 26.0

    mark_x = block_x
    mark_y = center_y - mark_h / 2.0
    text_x = block_x + mark_w + gap
    name_baseline = center_y + name_size * 0.34
    sub_baseline = name_baseline + 44.0

    tagline = "Building practical apps for real-world operations."
    tag_size = 27.0
    tag_paths, tag_w = text_to_paths(tagline, 400, tag_size, 0, 0, letter_spacing=0.6)
    tag_x = (W - tag_w) / 2.0
    tag_y = center_y + mark_h / 2.0 + 84.0

    svg = io.StringIO()
    svg.write(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d">' % (W, H, W, H)
    )
    svg.write("<defs>")
    svg.write(
        '<linearGradient id="g" x1="0" y1="0" x2="1" y2="0">'
        '<stop offset="0" stop-color="%s"/><stop offset="1" stop-color="%s"/></linearGradient>' % (BLUE_BRIGHT, CYAN)
    )
    # Aurora bloom, echoing the site's hero
    svg.write(
        '<radialGradient id="bloom" cx="0.5" cy="0.1" r="0.85">'
        '<stop offset="0" stop-color="%s" stop-opacity="0.34"/>'
        '<stop offset="0.55" stop-color="%s" stop-opacity="0.10"/>'
        '<stop offset="1" stop-color="%s" stop-opacity="0"/></radialGradient>' % (BLUE_BRIGHT, CYAN, INK)
    )
    svg.write("</defs>")

    svg.write('<rect width="%d" height="%d" fill="%s"/>' % (W, H, INK))
    svg.write('<rect width="%d" height="%d" fill="url(#bloom)"/>' % (W, H))

    # Mark
    svg.write('<g transform="translate(%.3f,%.3f) scale(%.4f)">' % (mark_x, mark_y, mark_scale))
    svg.write(
        '<g fill="none" stroke="url(#g)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round">'
    )
    for d in MARK_STROKES:
        svg.write('<path d="%s"/>' % d)
    svg.write("</g>")
    svg.write('<circle cx="110" cy="12" r="10" fill="%s"/>' % CYAN)
    svg.write('<circle cx="110" cy="12" r="3.8" fill="%s"/>' % INK)
    svg.write("</g>")

    # Wordmark: "vpathing" white + cyan slash, then "enterprise_llc" muted
    svg.write('<g fill="%s" transform="translate(%.3f,%.3f)">%s</g>' % (WHITE, text_x, name_baseline, name_a))
    svg.write('<g fill="%s" transform="translate(%.3f,%.3f)">%s</g>' % (CYAN, text_x, name_baseline, slash))
    svg.write('<g fill="%s" transform="translate(%.3f,%.3f)">%s</g>' % (MUTED, text_x + 2, sub_baseline, sub))

    # Tagline
    svg.write('<g fill="%s" transform="translate(%.3f,%.3f)">%s</g>' % (MUTED, tag_x, tag_y, tag_paths))

    # Cyan hairline, matching the site header
    svg.write('<rect x="0" y="%d" width="%d" height="4" fill="url(#g)"/>' % (H - 4, W))
    svg.write("</svg>")

    data = svg.getvalue()
    with io.open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write(data)
    print("Wrote %s (%.1f KB)" % (os.path.relpath(OUT, ROOT), len(data) / 1024.0))
    print("  wordmark width: %.1f  sub width: %.1f  tagline width: %.1f" % (name_w, sub_w, tag_w))


if __name__ == "__main__":
    build()
