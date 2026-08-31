import { getGeneralNews } from "./general-news.js";
import { getAiNews } from "./tldr-ai.js";

export async function getNews() {
    const [general, ai] = await Promise.all([getGeneralNews(), getAiNews()]);

    return {
        general,
        ai,
    };
}
