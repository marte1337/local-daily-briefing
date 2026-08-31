import { getGitSummary } from "./git.js";
import { getWeatherSummary } from "./weather.js";
import { getNews } from "./news/index.js";
import { summarizeWithOllama } from "./ollama.js";
import { buildDailyBriefingPrompt } from "./prompt.js";
import { inspectTldrArticleStructure } from "./news/tldr-ai.js";

async function main() {
    const repoPath = process.argv[2];
    const model = process.argv[3] ?? "qwen3.5:9b";

    if (!repoPath) {
        throw new Error("Usage: npx tsx src/index.ts <repository-path> [model]");
    }

    console.log(`Collecting Git activity from: ${repoPath}`);
    console.log(`Model: ${model}`);

    const [gitSummary, weatherSummary, newsSummary] = await Promise.all([getGitSummary(repoPath, "7 days ago"), getWeatherSummary(), getNews()]);

    console.log("\n=== Structured Git Data ===\n");
    console.log(JSON.stringify(gitSummary, null, 2));

    console.log("\n=== Structured Weather Data ===\n");
    console.log(JSON.stringify(weatherSummary, null, 2));

    console.log("\n=== Structured News Data ===\n");
    console.log(JSON.stringify(newsSummary, null, 2));

    await inspectTldrArticleStructure();

    // const prompt = buildDailyBriefingPrompt(gitSummary, weatherSummary, newsSummary);

    // console.log("\n=== AI Daily Briefing ===\n");

    // const briefing = await summarizeWithOllama(model, prompt, (token) => process.stdout.write(token));

    // console.log();

    // // Later we'll use this for email delivery.
    // void briefing;
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
