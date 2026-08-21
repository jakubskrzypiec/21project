#!/usr/bin/env python3
"""
Wkomponowuje logo 21 project w ekrany laptopa i telefonu na zdjęciu hero.

Logo nie jest nakładane płasko — jest przekształcane homografią na płaszczyznę
każdego ekranu, przycinane maską ekranu (dzięki czemu telefon poprawnie zasłania
laptopa) i przyciemniane trybem mnożenia z ukośnym refleksem szkła.

Wymaga: /tmp/logo-big.png i /tmp/mark-big.png (logo wyrenderowane z SVG na przezroczystym tle).
"""
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
import pathlib, sys

ROOT = pathlib.Path(__file__).parent
SRC = "/root/.claude/uploads/a647b377-254f-51f4-88c3-d751c4ce37dd/b89dd9a5-f03bd936be624ada87ca0411b46c3353.png"

# narożniki ekranów wyznaczone dopasowaniem prostych do krawędzi (maks. błąd < 1.7 px)
LAPTOP = [(944.5, 319.3), (1451.2, 305.8), (1461.7, 707.1), (927.2, 681.6)]
PHONE  = [(1394.2, 381.3), (1566.6, 379.7), (1566.5, 786.3), (1394.0, 784.4)]

OPACITY = 0.90          # siła logo na ekranie
SHEEN_ANGLE = 104       # kierunek refleksu, zgodny ze światłem na zdjęciu


def homography(quad):
    """Macierz 3x3 przenosząca kwadrat jednostkowy (0,0)-(1,1) na czworobok."""
    (x0, y0), (x1, y1), (x2, y2), (x3, y3) = quad
    A, b = [], []
    for (u, v), (x, y) in zip([(0, 0), (1, 0), (1, 1), (0, 1)],
                              [(x0, y0), (x1, y1), (x2, y2), (x3, y3)]):
        A.append([u, v, 1, 0, 0, 0, -u * x, -v * x]); b.append(x)
        A.append([0, 0, 0, u, v, 1, -u * y, -v * y]); b.append(y)
    h = np.linalg.solve(np.array(A, float), np.array(b, float))
    return np.append(h, 1).reshape(3, 3)


def apply_h(H, u, v):
    p = H @ np.array([u, v, 1.0])
    return p[0] / p[2], p[1] / p[2]


def pil_coeffs(dst, src):
    """Współczynniki dla Image.PERSPECTIVE — mapują punkt docelowy na źródłowy."""
    A, b = [], []
    for (X, Y), (x, y) in zip(dst, src):
        A.append([X, Y, 1, 0, 0, 0, -X * x, -Y * x]); b.append(x)
        A.append([0, 0, 0, X, Y, 1, -X * y, -Y * y]); b.append(y)
    return np.linalg.solve(np.array(A, float), np.array(b, float))


def screen_masks(img):
    a = np.asarray(img.convert("RGB")).astype(int)
    m = (a[:, :, 0] >= 253) & (a[:, :, 1] >= 253) & (a[:, :, 2] >= 253)
    lab, n = ndimage.label(m)
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    order = np.argsort(sizes)[::-1]
    return (lab == int(order[0]) + 1), (lab == int(order[1]) + 1)


def place(logo, quad, size, frac_w, aspect_hint=None):
    """Zwraca warstwę alpha (float 0..1) z logo wpisanym w czworobok ekranu."""
    W, H = size
    Hm = homography(quad)

    # rozmiar ekranu w pikselach mniej więcej pośrodku
    mid_w = np.hypot(*(np.subtract(apply_h(Hm, 1, .5), apply_h(Hm, 0, .5))))
    mid_h = np.hypot(*(np.subtract(apply_h(Hm, .5, 1), apply_h(Hm, .5, 0))))

    lw, lh = logo.size
    tgt_w_px = frac_w * mid_w
    tgt_h_px = tgt_w_px * lh / lw
    du, dv = tgt_w_px / mid_w, tgt_h_px / mid_h
    u0, u1 = .5 - du / 2, .5 + du / 2
    v0, v1 = .5 - dv / 2, .5 + dv / 2

    dst = [apply_h(Hm, u0, v0), apply_h(Hm, u1, v0),
           apply_h(Hm, u1, v1), apply_h(Hm, u0, v1)]
    src = [(0, 0), (lw, 0), (lw, lh), (0, lh)]

    warped = logo.transform((W, H), Image.PERSPECTIVE, pil_coeffs(dst, src),
                            resample=Image.BICUBIC)
    return np.asarray(warped.getchannel("A")).astype(np.float32) / 255.0


def sheen(size, quad):
    """Ukośny refleks szkła — jaśniejszy pas w górnej lewej części ekranu."""
    W, H = size
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    th = np.deg2rad(SHEEN_ANGLE)
    d = xx * np.cos(th) + yy * np.sin(th)
    q = np.array(quad, float)
    dq = q[:, 0] * np.cos(th) + q[:, 1] * np.sin(th)
    t = np.clip((d - dq.min()) / (dq.max() - dq.min() + 1e-6), 0, 1)
    # 0.30 na paśmie refleksu -> 1.0 w cieniu
    return np.interp(t, [0.0, 0.10, 0.20, 0.34, 0.60, 1.0],
                        [0.60, 0.32, 0.30, 0.80, 1.00, 0.92]).astype(np.float32)


def main():
    base = Image.open(SRC).convert("RGB")
    W, H = base.size
    lap_mask, pho_mask = screen_masks(base)

    logo = Image.open("/tmp/logo-big.png").convert("RGBA")
    mark = Image.open("/tmp/mark-big.png").convert("RGBA")

    arr = np.asarray(base).astype(np.float32)

    for quad, mask, art, frac in ((LAPTOP, lap_mask, logo, 0.56),
                                  (PHONE,  pho_mask, mark, 0.46)):
        a = place(art, quad, (W, H), frac)
        a *= sheen((W, H), quad)
        a *= mask.astype(np.float32)          # przycięcie do tafli ekranu
        a *= OPACITY
        a = np.asarray(Image.fromarray((a * 255).astype(np.uint8))
                       .filter(ImageFilter.GaussianBlur(0.4))).astype(np.float32) / 255.0
        arr *= (1.0 - a)[:, :, None]          # tryb mnożenia z czernią

    out = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

    # --- wersja pozioma (desktop) ---
    desk = out.resize((1600, round(H * 1600 / W)), Image.LANCZOS)
    desk.save(ROOT / "assets/img/hero-devices.webp", "WEBP", quality=90, method=6)
    print("hero-devices.webp", desk.size)

    # --- wersja pionowa (telefon) ---
    crop = out.crop((640, 60, W, H))
    MW, MH = 900, 1600
    sc = crop.resize((MW, round(crop.height * MW / crop.width)), Image.LANCZOS)
    off = MH - sc.height
    canvas = Image.new("RGB", (MW, MH))
    canvas.paste(sc, (0, off))
    band = sc.crop((0, 0, MW, 26)).resize((MW, off + 40), Image.LANCZOS)
    canvas.paste(band, (0, 0))
    seam = canvas.crop((0, off - 70, MW, off + 70)).filter(ImageFilter.GaussianBlur(16))
    canvas.paste(seam, (0, off - 70))
    canvas.save(ROOT / "assets/img/hero-mobile.webp", "WEBP", quality=90, method=6)
    print("hero-mobile.webp", canvas.size)


if __name__ == "__main__":
    main()
