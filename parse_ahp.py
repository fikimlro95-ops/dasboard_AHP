import re

with open("scratch_github_ahp.html", "r", encoding="utf-8") as f:
    text = f.read()

print("Title:", re.findall(r"<title>(.*?)</title>", text))
styles = re.findall(r'<link[^>]+>', text)
for s in styles:
    print("Link:", s)

scripts = re.findall(r'<script[^>]*src=[\'"]([^\'"]+)[\'"]', text)
print("Scripts:", scripts)

colors = re.findall(r'#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)', text)
print("Unique colors count:", len(set(colors)))
print("Sample colors:", list(set(colors))[:25])
