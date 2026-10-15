import urllib.request
import re
import json
import os

url = "https://www.behance.net/gallery/255912899/AI-Finance-Dashboard-Smarter-Money-Management-Design/modules/1491563811"
req = urllib.request.Request(url, headers={
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9"
})

try:
    with urllib.request.urlopen(req, timeout=15) as resp:
        html = resp.read().decode("utf-8", errors="ignore")
        print("Page fetched, length:", len(html))
        titles = re.findall(r"<title>(.*?)</title>", html)
        print("Title:", titles)
        og_images = re.findall(r'property="og:image"\s+content="([^"]+)"', html)
        print("OG Images:", og_images)
        modules = re.findall(r'https://mir-s3-cdn-cf\.behance\.net/project_modules/[^"\'\s]+', html)
        unique_modules = list(dict.fromkeys(modules))
        print(f"Found {len(unique_modules)} module images:")
        for idx, m in enumerate(unique_modules[:10]):
            print(f"[{idx}] {m}")
            # Download first 3 images to scratch for viewing
            if idx < 3:
                os.makedirs("scratch", exist_ok=True)
                img_path = f"scratch/behance_{idx}.jpg"
                try:
                    img_req = urllib.request.Request(m, headers={"User-Agent": "Mozilla/5.0"})
                    with urllib.request.urlopen(img_req) as img_resp:
                        with open(img_path, "wb") as f_img:
                            f_img.write(img_resp.read())
                    print(f"Downloaded {m} to {img_path}")
                except Exception as err:
                    print(f"Failed to download {m}: {err}")
except Exception as e:
    print("Error fetching Behance:", e)
