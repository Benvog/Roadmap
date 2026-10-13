"""Draws the PNG app icons from the same shapes as assets/icon.svg.

Run from the repo root:  "%LOCALAPPDATA%\\Programs\\Python\\Python313\\python.exe" tools/make_icons.py
Needs Pillow. Re-run it if the icon's design changes, and keep it in step with assets/icon.svg.
"""
from PIL import Image, ImageDraw

AMBER, INK = (255, 180, 84, 255), (26, 18, 6, 255)
CENTRE = (256, 256)
SPOKES = [(256, 112), (381, 328), (131, 328)]          # where the three lines end
NODES = [((256, 256), 58), ((256, 108), 36), ((384, 330), 36), ((128, 330), 36)]
LINE = 26
SMOOTH = 4                                              # draw this many times larger, then shrink, for clean edges


def icon(size, rounded, mark_scale=1.0):
    """`rounded` gives the tile its own round corners; without it the tile fills the square, for a launcher to shape.
    `mark_scale` shrinks the mark toward the centre so a launcher's own shape does not cut into it."""
    big = 512 * SMOOTH
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    def at(point):
        return tuple((CENTRE[i] + (point[i] - CENTRE[i]) * mark_scale) * SMOOTH for i in (0, 1))

    def disc(point, radius, fill=INK):
        x, y = at(point)
        r = radius * mark_scale * SMOOTH
        d.ellipse((x - r, y - r, x + r, y + r), fill=fill)

    if rounded:
        d.rounded_rectangle((0, 0, big - 1, big - 1), radius=116 * SMOOTH, fill=AMBER)
    else:
        d.rectangle((0, 0, big, big), fill=AMBER)
    for end in SPOKES:
        d.line((at(CENTRE), at(end)), fill=INK, width=round(LINE * mark_scale * SMOOTH))
    for point, radius in NODES:
        disc(point, radius)
    return img.resize((size, size), Image.LANCZOS)


if __name__ == "__main__":
    icon(192, rounded=True).save("assets/icon-192.png")
    icon(512, rounded=True).save("assets/icon-512.png")
    # "Maskable": Android crops this to a circle or squircle, so the mark stays inside the middle 80%.
    icon(512, rounded=False, mark_scale=0.86).save("assets/icon-maskable-512.png")
    # iOS rounds the corners itself and does not want transparency.
    icon(180, rounded=False, mark_scale=0.86).convert("RGB").save("assets/apple-touch-icon.png")
    print("icons written to assets/")
