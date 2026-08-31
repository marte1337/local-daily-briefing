import * as cheerio from "cheerio";
import type { NewsItem } from "../types.js";
import { deduplicateNews } from "./news-utils.js";
import { cleanTldrUrl, fetchHtml, getLatestTldrIssueUrl, getTldrIssueDate, normalizeText, TLDR_AI_SECTIONS } from "./tldr-utils.js";

export async function getAiNews(): Promise<NewsItem[]> {
    const issueUrl = await getLatestTldrIssueUrl();
    const html = await fetchHtml(issueUrl);
    const $ = cheerio.load(html);

    const items: NewsItem[] = [];
    let currentSection: string | null = null;

    $("h1, a[href]").each((_, element) => {
        if (element.tagName === "h1") {
            currentSection = normalizeText($(element).text());
            return;
        }

        if (!currentSection || !TLDR_AI_SECTIONS.has(currentSection)) {
            return;
        }

        const text = normalizeText($(element).text());
        const href = $(element).attr("href");

        if (!text || !href) {
            return;
        }

        const match = text.match(/^(.*?)\s*\((\d+)\s+minute(?:s)? read\)$/i);

        if (!match) {
            return;
        }

        const title = match[1]?.trim();

        if (!title) {
            return;
        }

        items.push({
            title,
            source: "TLDR AI",
            url: cleanTldrUrl(href),
            publishedAt: getTldrIssueDate(issueUrl),
            summary: null,
            section: currentSection,
        });
    });

    return deduplicateNews(items).slice(0, 10);
}

export async function inspectTldrArticleStructure(): Promise<void> {
    const issueUrl = await getLatestTldrIssueUrl();
    const html = await fetchHtml(issueUrl);
    const $ = cheerio.load(html);

    const articleLink = $("a[href]")
        .filter((_, element) => {
            const text = normalizeText($(element).text());

            return text.includes("Anthropic's Model Hardware Standard");
        })
        .first();

    if (articleLink.length === 0) {
        throw new Error("Could not find example TLDR article.");
    }

    console.log("\n=== TLDR Article Structure ===\n");

    console.log(articleLink.parent().text().replace(/\s+/g, " ").trim());

    console.log("\n--- Parent HTML ---\n");

    console.log(articleLink.parent().html());
}
