import type { NewsItem } from "../types.js";
import { deduplicateNews, getFeedNews, sortNewestFirst, type FeedConfig } from "./news-utils.js";

const TAGESSCHAU: FeedConfig = {
    source: "Tagesschau",
    url: "https://www.tagesschau.de/index~rss2.xml",
    filter: (item) => {
        const link = item.link ?? "";

        return !link.includes("/video/") && !link.includes("/video-") && !link.includes("/livestream");
    },
};

export async function getGeneralNews(): Promise<NewsItem[]> {
    const items = await getFeedNews(TAGESSCHAU);

    return deduplicateNews(sortNewestFirst(items)).slice(0, 5);
}
