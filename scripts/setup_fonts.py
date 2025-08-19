#!/usr/bin/env python3
"""
Setup script for 101xFounders video template fonts
Downloads and sets up the required fonts for the video template
"""

import os
import requests
import zipfile
import tempfile


def download_font(url, filename):
    """Download a font file from URL"""
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()

        font_path = os.path.join("fonts", filename)
        os.makedirs("fonts", exist_ok=True)

        with open(font_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

        print(f"✅ Downloaded {filename}")
        return True
    except Exception as e:
        print(f"❌ Failed to download {filename}: {e}")
        return False


def setup_fonts():
    """Download and set up all required fonts"""
    print("Setting up fonts for 101xFounders template...")

    # Create fonts directory
    os.makedirs("fonts", exist_ok=True)

    # Font URLs from Google Fonts
    fonts = {
        "Inter-Thin.ttf": "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2",
        "Inter-ExtraBold.ttf": "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2",
        "Inter-Light.ttf": "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2",
    }

    success_count = 0
    for filename, url in fonts.items():
        if download_font(url, filename):
            success_count += 1

    print(f"\n✅ Setup complete! {success_count}/{len(fonts)} fonts downloaded.")
    print("Note: Inter fonts downloaded from Google Fonts.")
    print("For Neue Haas Grotesk Display, please ensure it's installed on your system.")


if __name__ == "__main__":
    setup_fonts()
