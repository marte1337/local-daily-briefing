import type { NewsItem } from "../types.js";
import { summarizeWithOllama } from "../ollama.js";

export async function translateNewsTitles(items: NewsItem[], model: string): Promise<NewsItem[]> {
    const titles = items.map((item) => item.title);

    const prompt = `
Translate these German news headlines into concise, natural English news headlines.

Rules:
- Keep the same order.
- Translate the headline only.
- Do not summarize or explain it.
- Do not add facts.
- Preserve names of people, companies, organizations and places.
- Return ONLY a valid JSON array of strings.
- Do not use Markdown or code fences.

Headlines:
${JSON.stringify(titles, null, 2)}
`;

    const response = await summarizeWithOllama(model, prompt);

    let translatedTitles: unknown;

    try {
        translatedTitles = JSON.parse(response);
    } catch {
        throw new Error(`Could not parse translated news titles:\n${response}`);
    }

    if (!Array.isArray(translatedTitles) || translatedTitles.length !== items.length || !translatedTitles.every((title) => typeof title === "string")) {
        throw new Error("Ollama returned an invalid news-title translation.");
    }

    return items.map((item, index) => ({
        ...item,
        englishTitle: translatedTitles[index],
    }));
}
