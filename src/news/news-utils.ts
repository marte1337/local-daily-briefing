import Parser from "rss-parser";
import type { NewsItem } from "../types.js";

export const parser = new Parser();

export type FeedItem = Awaited<ReturnType<typeof parser.parseURL>>["items"][number];

export type FeedConfig = {
    source: string;
    url: string;
    filter?: (item: FeedItem) => boolean;
};

export async function getFeedNews(config: FeedConfig): Promise<NewsItem[]> {
    const feed = await parser.parseURL(config.url);

    return feed.items.flatMap((item): NewsItem[] => {
        if (config.filter && !config.filter(item)) {
            return [];
        }

        const title = item.title?.trim();
        const url = item.link?.trim();

        if (!title || !url) {
            return [];
        }

        return [
            {
                title,
                source: config.source,
                url,
                publishedAt: item.isoDate ?? item.pubDate ?? null,
                summary: item.contentSnippet?.trim() || null,
            },
        ];
    });
}

export function sortNewestFirst(items: NewsItem[]): NewsItem[] {
    return [...items].sort((a, b) => {
        const aTime = a.publishedAt ? Date.parse(a.publishedAt) : 0;

        const bTime = b.publishedAt ? Date.parse(b.publishedAt) : 0;

        return bTime - aTime;
    });
}

export function deduplicateNews(items: NewsItem[]): NewsItem[] {
    const seenUrls = new Set<string>();
    const seenTitles = new Set<string>();

    return items.filter((item) => {
        const normalizedUrl = item.url.trim().replace(/\/$/, "");

        const normalizedTitle = item.title.trim().toLowerCase();

        if (seenUrls.has(normalizedUrl) || seenTitles.has(normalizedTitle)) {
            return false;
        }

        seenUrls.add(normalizedUrl);
        seenTitles.add(normalizedTitle);

        return true;
    });
}
