"""Génère les visuels système NØVYX à partir de la charte (voir branding.md).

Marque : étoile « explosion » à 12 branches (sun) + Ø en Dela Gothic One
(encre), contour encre à joints arrondis et ombre dure décalée.

Fichiers produits :
  assets/icon.png                     1024×1024, fond tangerine (iOS + Android)
  assets/adaptive-icon.png            1024×1024, premier plan transparent (Android)
  assets/adaptive-icon-monochrome.png 1024×1024, silhouette (icônes thématiques Android 13+)
  assets/splash.png                   1024×1024, marque seule sur fond transparent
  assets/favicon.png                  48×48 (web)
  assets/notification-icon.png        96×96, silhouette blanche (notifications Android)
  play-store/icon-512.png             512×512 (fiche Play Store)

Utilisation (depuis la racine du projet, Python 3 + Pillow) :
  python scripts/generate_brand_assets.py
"""
import math
import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = os.path.join(
    ROOT, 'node_modules', '@expo-google-fonts', 'dela-gothic-one',
    '400Regular', 'DelaGothicOne_400Regular.ttf',
)

INK = (23, 18, 14)
TANGERINE = (255, 90, 31)
SUN = (255, 197, 61)

SS = 4  # sur-échantillonnage, puis réduction Lanczos
GLYPH = 'Ø'
GLYPH_SCALE = 1.08  # taille du Ø par rapport au rayon de l'étoile
GLYPH_ROTATE = 6  # degrés, sens anti-horaire


def star_points(cx, cy, r_out, spikes=12, inner=0.78, rot=-12):
    """Même étoile que le composant Burst (12 branches, rayon intérieur 78 %)."""
    pts = []
    for i in range(spikes * 2):
        r = r_out if i % 2 == 0 else r_out * inner
        a = math.pi * i / spikes - math.pi / 2 + math.radians(rot)
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def stroke_polygon(draw, pts, color, width):
    """Contour à joints arrondis (équivalent de strokeLinejoin="round")."""
    for i, p in enumerate(pts):
        draw.line([p, pts[(i + 1) % len(pts)]], fill=color, width=int(width))
    r = width / 2
    for x, y in pts:
        draw.ellipse([x - r, y - r, x + r, y + r], fill=color)


def glyph_alpha(size, cx, cy, font_px):
    """Masque alpha du Ø, centré sur (cx, cy) et légèrement penché."""
    layer = Image.new('L', (size, size), 0)
    d = ImageDraw.Draw(layer)
    font = ImageFont.truetype(FONT, int(font_px))
    left, top, right, bottom = d.textbbox((0, 0), GLYPH, font=font)
    d.text((cx - (right - left) / 2 - left, cy - (bottom - top) / 2 - top), GLYPH, font=font, fill=255)
    return layer.rotate(GLYPH_ROTATE, resample=Image.BICUBIC, center=(cx, cy))


def mark_center(size, ratio):
    # léger décalage vers le haut-gauche pour centrer optiquement étoile + ombre
    return size / 2 - size * ratio * 0.035


def render_mark(size, ratio, background=None):
    """Étoile + Ø avec contour et ombre dure. background None = transparent."""
    S = size * SS
    canvas = Image.new('RGBA', (S, S), (0, 0, 0, 0) if background is None else background + (255,))
    d = ImageDraw.Draw(canvas)
    c = mark_center(S, ratio)
    r = S * ratio
    stroke = r * 0.075
    shadow = star_points(c + r * 0.07, c + r * 0.085, r)
    d.polygon(shadow, fill=INK)
    stroke_polygon(d, shadow, INK, stroke)
    star = star_points(c, c, r)
    d.polygon(star, fill=SUN)
    stroke_polygon(d, star, INK, stroke)
    ink = Image.new('RGBA', (S, S), INK + (255,))
    canvas.paste(ink, (0, 0), glyph_alpha(S, c, c, r * GLYPH_SCALE))
    return canvas.resize((size, size), Image.LANCZOS)


def render_silhouette(size, ratio):
    """Étoile pleine avec le Ø évidé, en blanc (seul l'alpha compte)."""
    S = size * SS
    c = mark_center(S, ratio)
    r = S * ratio
    star = Image.new('L', (S, S), 0)
    ImageDraw.Draw(star).polygon(star_points(c, c, r), fill=255)
    alpha = Image.composite(Image.new('L', (S, S), 0), star, glyph_alpha(S, c, c, r * GLYPH_SCALE))
    out = Image.new('RGBA', (S, S), (255, 255, 255, 0))
    out.putalpha(alpha)
    return out.resize((size, size), Image.LANCZOS)


def main():
    assets = os.path.join(ROOT, 'assets')
    # Icône principale : fond plein (iOS refuse la transparence)
    icon = render_mark(1024, 0.41, background=TANGERINE)
    icon.convert('RGB').save(os.path.join(assets, 'icon.png'))
    # Android adaptatif : la marque tient dans la zone sûre (cercle de 66/108),
    # le fond tangerine est fourni par app.json (adaptiveIcon.backgroundColor)
    render_mark(1024, 0.285).save(os.path.join(assets, 'adaptive-icon.png'))
    render_silhouette(1024, 0.285).save(os.path.join(assets, 'adaptive-icon-monochrome.png'))
    # Splash : marque seule, fond papier fourni par le plugin expo-splash-screen
    render_mark(1024, 0.41).save(os.path.join(assets, 'splash.png'))
    icon.resize((48, 48), Image.LANCZOS).convert('RGB').save(os.path.join(assets, 'favicon.png'))
    render_silhouette(96, 0.42).save(os.path.join(assets, 'notification-icon.png'))
    icon.resize((512, 512), Image.LANCZOS).convert('RGB').save(os.path.join(ROOT, 'play-store', 'icon-512.png'))
    print('Visuels NØVYX générés.')


if __name__ == '__main__':
    main()
