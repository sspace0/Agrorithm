"""Build small runtime derivatives from the project's permitted source images."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
logo = Image.open(ROOT / "assets/branding/agrorithm-original-transparent.png").convert("RGBA")
bounds = logo.getchannel("A").getbbox()
if not bounds:
    raise ValueError("The supplied logo has no visible pixels")
logo.crop(bounds).save(ROOT / "public/images/agrorithm-logo.png")
earth = Image.open(ROOT / "public/images/blue-marble-2004-08.jpg").convert("RGB")
earth.resize((2048, 1024), Image.Resampling.LANCZOS).save(
    ROOT / "public/images/earth-2004.webp", quality=85, method=6
)
print(f"Logo alpha bounds: {bounds}; Earth preview: 2048 × 1024")
