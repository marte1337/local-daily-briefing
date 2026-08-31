import Parser from "rss-parser";
import * as cheerio from "cheerio";

export type NewsItem = {
    title: string;
    source: string;
    url: string;
    publishedAt: string | null;
    summary: string | null;
};

const parser = new Parser();

type FeedItem = Awaited<ReturnType<typeof parser.parseURL>>["items"][number];

type FeedConfig = {
    source: string;
    url: string;
    filter?: (item: FeedItem) => boolean;
};

const TAGESSCHAU: FeedConfig = {
    source: "Tagesschau",
    url: "https://www.tagesschau.de/index~rss2.xml",
    filter: (item) => {
        const link = item.link ?? "";

        return !link.includes("/video/") && !link.includes("/video-/") && !link.includes("/livestream");
    },
};

const TLDR_AI_HOME = "https://ai.tldr.tech/";
const REQUEST_TIMEOUT_MS = 10_000;

const HUGGING_FACE: FeedConfig = {
    source: "Hugging Face",
    url: "https://huggingface.co/blog/feed.xml",
};

const OPENAI: FeedConfig = {
    source: "OpenAI",
    url: "https://openai.com/news/rss.xml",
};

async function getFeedNews(config: FeedConfig): Promise<NewsItem[]> {
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

function sortNewestFirst(items: NewsItem[]): NewsItem[] {
    return [...items].sort((a, b) => {
        const aTime = a.publishedAt ? Date.parse(a.publishedAt) : 0;

        const bTime = b.publishedAt ? Date.parse(b.publishedAt) : 0;

        return bTime - aTime;
    });
}

function deduplicateNews(items: NewsItem[]): NewsItem[] {
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

async function getGeneralNews(): Promise<NewsItem[]> {
    const items = await getFeedNews(TAGESSCHAU);

    return deduplicateNews(sortNewestFirst(items)).slice(0, 5);
}

export async function getLatestTldrIssueUrl(): Promise<string> {
    const response = await fetch(TLDR_AI_HOME, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
        throw new Error(`TLDR AI request failed: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const href = $('a[href*="/p/"]').first().attr("href");

    if (!href) {
        throw new Error("Could not find the latest TLDR AI issue.");
    }

    return new URL(href, TLDR_AI_HOME).toString();
}

async function getAiNews(): Promise<NewsItem[]> {
    const feeds = await Promise.all([getFeedNews(HUGGING_FACE), getFeedNews(OPENAI)]);

    return deduplicateNews(sortNewestFirst(feeds.flat())).slice(0, 10);
}

export async function getNews() {
    const [general, ai] = await Promise.all([getGeneralNews(), getAiNews()]);

    return {
        general,
        ai,
    };
}
