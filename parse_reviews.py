#!/usr/bin/env python3
"""Парсер последних отзывов о «Комодском варане» с Яндекс.Карт.

Делает один запрос к публичной странице отзывов, извлекает имя автора,
оценку, дату и текст, сортирует отзывы по дате и сохраняет 6 последних
в reviews.json. Внешние зависимости: requests.
"""

import html
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests

URL = "https://yandex.by/maps/org/117862567707/reviews/"
OUT_FILE = Path(__file__).with_name("reviews.json")
LIMIT = 6

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    ),
    "Accept-Language": "ru-RU,ru;q=0.9",
}


MONTHS = (
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря",
)


def format_date(iso_date: str) -> str:
    """2024-06-16 → 16 июня 2024."""
    date = datetime.strptime(iso_date[:10], "%Y-%m-%d")
    return f"{date.day} {MONTHS[date.month - 1]} {date.year}"


def clean(fragment: str) -> str:
    """Убирает теги и HTML-сущности из фрагмента."""
    text = re.sub(r"<br\s*/?>", "\n", fragment)
    text = re.sub(r"<[^>]+>", "", text)
    return re.sub(r"[ \t]+", " ", html.unescape(text)).strip()


def parse_reviews(page: str) -> list[dict]:
    starts = [m.start() for m in re.finditer(r'<div class="business-review-view"', page)]
    reviews = []

    for i, start in enumerate(starts):
        block = page[start : starts[i + 1] if i + 1 < len(starts) else len(page)]

        author = re.search(
            r'business-review-view__author-name.*?<span[^>]*itemProp="name"[^>]*>(.*?)</span>',
            block,
            re.S,
        )
        rating = re.search(r'aria-label="Оценка (\d+) Из 5"', block)
        iso_date = re.search(r'itemProp="datePublished" content="([^"]+)"', block)
        body = re.search(
            r'business-review-view__body.*?spoiler-view__text-container[^>]*>(.*?)</span>',
            block,
            re.S,
        )

        if not (author and rating and iso_date and body):
            continue

        text = clean(body.group(1))
        if not text:
            continue

        reviews.append(
            {
                "author": clean(author.group(1)),
                "rating": int(rating.group(1)),
                "date": iso_date.group(1)[:10],
                "date_text": format_date(iso_date.group(1)),
                "text": text,
            }
        )

    # Свежие отзывы — первыми.
    reviews.sort(key=lambda r: r["date"], reverse=True)
    return reviews[:LIMIT]


def parse_aggregate(page: str) -> dict:
    match = re.search(
        r"Рейтинг\s*([\d,.]+)\s*на основе\s*(\d+)\s*оценок\s*и\s*(\d+)\s*отзыв",
        page,
    )
    if not match:
        return {}
    return {
        "rating": float(match.group(1).replace(",", ".")),
        "ratings_count": int(match.group(2)),
        "reviews_count": int(match.group(3)),
    }


def main() -> None:
    response = requests.get(URL, headers=HEADERS, timeout=40)
    response.raise_for_status()
    page = response.text

    if "showcaptcha" in page or "Подтвердите, что запросы отправляли вы" in page:
        raise RuntimeError("Яндекс.Карты запросили капчу — попробуйте позже.")

    reviews = parse_reviews(page)
    if not reviews:
        raise RuntimeError("Не удалось найти отзывы в разметке страницы.")

    data = {
        "source": URL,
        "parsed_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "organization": "ООО «Комодский варан»",
        "aggregate": parse_aggregate(page),
        "reviews": reviews,
    }
    OUT_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Сохранено отзывов: {len(reviews)} → {OUT_FILE.name}")
    for review in reviews:
        print(f"  {review['date']}  {review['rating']}★  {review['author']}: {review['text'][:60]}")


if __name__ == "__main__":
    main()
