import * as cheerio from "cheerio";

export const TLDR_AI_HOME = "https://ai.tldr.tech/";
export const REQUEST_TIMEOUT_MS = 10_000;

export const TLDR_AI_SECTIONS = new Set(["Headlines & Launches", "Deep Dives & Analysis", "Engineering & Research"]);

export function normalizeText(value: string): string {
    return value.replace(/\s+/g, " ").trim();
}

export function cleanTldrUrl(rawUrl: string): string {
    const url = new URL(rawUrl);

    for (const key of [...url.searchParams.keys()]) {
        if (key.startsWith("utm_")) {
            url.searchParams.delete(key);
        }
    }

    return url.toString();
}

export function getTldrIssueDate(issueUrl: string): string | null {
    const match = issueUrl.match(/\/p\/(\d{4}-\d{2}-\d{2})-/);

    return match?.[1] ?? null;
}

export async function fetchHtml(url: string): Promise<string> {
    const response = await fetch(url, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }

    return response.text();
}

export async function getLatestTldrIssueUrl(): Promise<string> {
    const html = await fetchHtml(TLDR_AI_HOME);
    const $ = cheerio.load(html);

    const href = $('a[href*="/p/"]').first().attr("href");

    if (!href) {
        throw new Error("Could not find the latest TLDR AI issue.");
    }

    return new URL(href, TLDR_AI_HOME).toString();
}
