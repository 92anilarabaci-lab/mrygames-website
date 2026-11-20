"""Prepare web-ready media for the MRY GAMES site.

Usage (run from the repository root):
    python tools/prepare_media.py shot  SRC.png  OUT.webp   [--width 720]
    python tools/prepare_media.py crop  SRC.png  OUT.webp   --box x0 y0 x1 y1 [--width 1280]
    python tools/prepare_media.py fit   SRC.png  OUT.webp   --width 256          (keeps alpha)
    python tools/prepare_media.py fonts SRC_DIR  OUT_DIR                       (TTF -> subset WOFF)

Needs Pillow (images) and fontTools (fonts). Sources are only read, never changed.
"""
import argparse
import os
import sys

WEBP_QUALITY = 82
# Basic Latin, Latin-1, Latin Extended-A (covers Turkish), general punctuation, euro/lira signs.
FONT_UNICODES = "U+0000-00FF,U+0100-017F,U+2000-206F,U+20AC,U+20BA,U+2122,U+2190-2193"


def _resize(img, width):
    if width and img.width > width:
        height = round(img.height * width / img.width)
        img = img.resize((width, height), resample=3)  # LANCZOS
    return img


def _save(img, out):
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    img.save(out, "WEBP", quality=WEBP_QUALITY, method=6)
    print(f"{out}  {img.width}x{img.height}  {os.path.getsize(out) // 1024} KB")


def cmd_image(args):
    from PIL import Image

    img = Image.open(args.src)
    img = img.convert("RGBA" if args.mode == "fit" else "RGB")
    if args.mode == "crop":
        if not args.box:
            sys.exit("crop needs --box x0 y0 x1 y1")
        img = img.crop(tuple(args.box))
    _save(_resize(img, args.width), args.out)


def cmd_fonts(args):
    from fontTools import subset

    os.makedirs(args.out, exist_ok=True)
    for name in sorted(os.listdir(args.src)):
        if not name.lower().endswith(".ttf"):
            continue
        out = os.path.join(args.out, os.path.splitext(name)[0] + ".woff")
        subset.main([
            os.path.join(args.src, name),
            f"--unicodes={FONT_UNICODES}",
            "--flavor=woff",
            "--layout-features=*",
            f"--output-file={out}",
        ])
        print(f"{out}  {os.path.getsize(out) // 1024} KB")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("mode", choices=["shot", "crop", "fit", "fonts"])
    p.add_argument("src")
    p.add_argument("out")
    p.add_argument("--width", type=int, default=720)
    p.add_argument("--box", type=int, nargs=4)
    args = p.parse_args()
    if args.mode == "fonts":
        cmd_fonts(args)
    else:
        cmd_image(args)


if __name__ == "__main__":
    main()
