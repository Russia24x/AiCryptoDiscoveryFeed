#!/usr/bin/env python3
"""Audit all RSS sources — fetch each one and report item counts + sample titles."""

import concurrent.futures
import json
import re
import sys
import time
import urllib.request
import xml.etree.ElementTree as ET

USER_AGENT = "Mozilla/5.0 (compatible; AiCryptoDiscoveryBot/1.0; +https://ai-crypto-discovery.pages.dev)"

# All sources from src/lib/sources/index.ts
SOURCES = [
    # Persian Crypto
    ("arzdigital-breaking", "https://arzdigital.com/breaking/feed/", "fa", "crypto"),
    ("arzdigital-blog", "https://arzdigital.com/blog/feed/", "fa", "crypto"),
    ("mihanblockchain-news", "https://mihanblockchain.com/category/news/feed/", "fa", "crypto"),
    ("mihanblockchain-learn", "https://mihanblockchain.com/category/learn/feed/", "fa", "crypto"),
    ("digiato-crypto", "https://digiato.com/topic/tech/cryptocurrency/feed/", "fa", "crypto"),
    # Persian AI
    ("digiato-ai", "https://digiato.com/topic/tech/artificial-intelligence/feed/", "fa", "ai"),
    ("zoomit-ai", "https://www.zoomit.ir/ai-articles/feed/", "fa", "ai"),
    # Persian Tech
    ("digiato-tech", "https://digiato.com/topic/tech/feed/", "fa", "tech"),
    ("shahrsakhtafzar-news", "https://www.shahrsakhtafzar.com/fa/news/feed", "fa", "tech"),
    ("sakhtafzarmag", "https://sakhtafzarmag.com/feed/", "fa", "tech"),
    # Persian Gaming
    ("vigiato-game-reviews", "https://vigiato.net/c/game-reviews/feed", "fa", "gaming"),
    ("gamefa-game-news", "https://gamefa.com/category/game/news/feed/", "fa", "gaming"),
    # Persian Entertainment
    ("gamefa-cinema", "https://gamefa.com/category/cinema/cinema-news/feed/", "fa", "entertainment"),
    ("vigiato-cinema-tv", "https://vigiato.net/c/cinema-tv/feed", "fa", "entertainment"),
    ("vigiato-entertainment", "https://vigiato.net/c/entertainment/feed", "fa", "entertainment"),
    # English Crypto
    ("coindesk", "https://www.coindesk.com/arc/outboundfeeds/rss/?outputType=xml", "en", "crypto"),
    ("cointelegraph", "https://cointelegraph.com/rss", "en", "crypto"),
    ("decrypt", "https://decrypt.co/feed", "en", "crypto"),
    ("bitcoinmagazine", "https://bitcoinmagazine.com/.rss/full", "en", "crypto"),
    # English AI
    ("techcrunch-ai", "https://techcrunch.com/category/artificial-intelligence/feed/", "en", "ai"),
    ("venturebeat-ai", "https://venturebeat.com/category/ai/feed/", "en", "ai"),
    ("theverge-ai", "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", "en", "ai"),
    # English Tech
    ("ars-technica", "https://feeds.arstechnica.com/arstechnica/index", "en", "tech"),
    ("engadget", "https://www.engadget.com/rss.xml", "en", "tech"),
    ("techcrunch", "https://techcrunch.com/feed/", "en", "tech"),
    # English Gaming
    ("ign", "https://feeds.ign.com/ign/all", "en", "gaming"),
    ("polygon", "https://www.polygon.com/rss/index.xml", "en", "gaming"),
    # English Entertainment
    ("variety", "https://variety.com/feed/", "en", "entertainment"),
    ("hollywood-reporter", "https://www.hollywoodreporter.com/feed/", "en", "entertainment"),
]


def fetch_feed(src):
    sid, url, lang, cat = src
    start = time.time()
    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": USER_AGENT, "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*"},
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            content = resp.read().decode("utf-8", errors="replace")
            status = resp.status
        elapsed = time.time() - start
        # Count <item> or <entry> tags
        items = re.findall(r"<item\b", content, re.IGNORECASE)
        entries = re.findall(r"<entry\b", content, re.IGNORECASE)
        count = len(items) + len(entries)
        # Extract first title
        title_match = re.search(r"<title[^>]*>([^<]+)</title>", content, re.IGNORECASE)
        title = title_match.group(1).strip()[:80] if title_match else "(no title)"
        return {
            "id": sid,
            "url": url,
            "lang": lang,
            "category": cat,
            "status": status,
            "items": count,
            "title": title,
            "elapsed": round(elapsed, 2),
            "error": None,
        }
    except Exception as e:
        elapsed = time.time() - start
        return {
            "id": sid,
            "url": url,
            "lang": lang,
            "category": cat,
            "status": 0,
            "items": 0,
            "title": "",
            "elapsed": round(elapsed, 2),
            "error": str(e)[:200],
        }


def main():
    print(f"Auditing {len(SOURCES)} RSS sources...\n")
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(fetch_feed, src): src for src in SOURCES}
        for future in concurrent.futures.as_completed(futures):
            r = future.result()
            results.append(r)
            status_emoji = "✅" if r["error"] is None and r["items"] > 0 else "❌"
            print(
                f"{status_emoji} {r['id']:30s} | {r['lang']} | {r['category']:13s} | "
                f"{r['items']:3d} items | {r['elapsed']:5.2f}s | "
                f"{r['error'] or r['title'][:50]}"
            )

    print("\n=== Summary ===")
    by_lang = {"fa": [0, 0], "en": [0, 0]}  # [ok, broken]
    by_cat = {}
    for r in results:
        is_ok = r["error"] is None and r["items"] > 0
        by_lang[r["lang"]][0 if is_ok else 1] += 1
        if r["category"] not in by_cat:
            by_cat[r["category"]] = [0, 0]
        by_cat[r["category"]][0 if is_ok else 1] += 1

    print(f"Persian sources: {by_lang['fa'][0]} ok, {by_lang['fa'][1]} broken")
    print(f"English sources: {by_lang['en'][0]} ok, {by_lang['en'][1]} broken")
    for cat, (ok, broken) in by_cat.items():
        print(f"  {cat}: {ok} ok, {broken} broken")

    total_ok = sum(1 for r in results if r["error"] is None and r["items"] > 0)
    total_broken = len(results) - total_ok
    print(f"\nTotal: {total_ok} ok, {total_broken} broken out of {len(results)}")

    avg_time = sum(r["elapsed"] for r in results) / len(results)
    max_time = max(r["elapsed"] for r in results)
    print(f"Avg fetch time: {avg_time:.2f}s, Max: {max_time:.2f}s")

    # Save full results
    with open("/tmp/source-audit.json", "w") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print("\nFull results: /tmp/source-audit.json")


if __name__ == "__main__":
    main()
