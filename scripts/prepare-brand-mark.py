from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
source = Image.open(root / "assets/branding/agrorithm-o-edited.png").convert("RGBA")
bounds = source.getbbox()
if not bounds:
    raise ValueError("The isolated botanical mark has no visible pixels")
mark = source.crop(bounds)
mark.thumbnail((180, 220), Image.Resampling.LANCZOS)
canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
canvas.alpha_composite(mark, ((256 - mark.width) // 2, (256 - mark.height) // 2))
canvas.save(root / "public/images/agrorithm-o.png", optimize=True)
