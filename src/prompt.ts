import type { GitSummary, NewsSummary, WeatherSummary } from "./types.js";

export function buildDailyBriefingPrompt(gitSummary: GitSummary, weatherSummary: WeatherSummary, newsSummary: NewsSummary): string {
    return `
Create a concise personal morning briefing from the structured data below.

OUTPUT EXACTLY THESE FOUR SECTIONS:

## Project
## Weather — Bremen
## News
## AI News

Do not add an introduction, conclusion, key takeaway, recommendations,
follow-up questions, or additional sections.

GENERAL RULES:
- Only state facts supported by the supplied data.
- Do not invent causes, consequences, predictions, technical details, or context.
- Prefer concise synthesis over repeating the raw input.

PROJECT:
- Mention the branch and working-tree state.
- Summarize the main recent development activity.
- Treat each commit as an independent source of evidence.
- Do not attribute changes from one commit to another.
- Do not infer functionality or architecture from filenames.
- Do not interpret vague commit messages beyond what they state.
- Use supplied Git statistics exactly; do not calculate totals yourself.
- Line counts indicate change size only, not importance or quality.
- Use absolute Git dates when useful; do not invent "today" or "yesterday".

WEATHER:
- Distinguish current conditions from today's forecast.
- Use supplied temperatures, wind speed and precipitation probability exactly.
- Precipitation probability is not rainfall amount.
- Do not claim precipitation or thunderstorms are guaranteed.
- Do not invent hourly timing.
- Keep this section short.

NEWS:
- Select about 3-4 of the most important general-news candidates.
- Prioritize broad German, European, international, economic and geopolitical significance.
- Deprioritize local crime, sports, entertainment and human-interest stories unless they have unusually broad significance.
- Publication recency alone does not make a story important.
- Use only the supplied title and summary as factual evidence.
- Translate both the article title and summary into clear, polished English.
- Keep the translated title concise and faithful to the original meaning.
- Summarize each selected item in one concise sentence.
- Closely paraphrase the supplied summary; do not introduce new causal relationships, motives, interpretations, or stronger claims.
- Do not invent additional background or predictions.
- Every selected item MUST include its supplied URL as a Markdown link.
- Format each item like:
  - [Translated English title](exact supplied URL) — concise English summary

AI NEWS:
- Select about 3-5 of the most useful AI-news candidates.
- Prioritize models, developer tooling, APIs, local/open-weight AI,
  inference/runtime developments and meaningful research.
- Use the supplied title and summary as factual evidence.
- Do not strengthen or embellish the source claims.
- Summarize each selected item in one concise sentence.
- Do not simply reproduce the supplied summary verbatim.
- Keep each item to roughly 1-2 lines of briefing text.
- Every selected AI item MUST include its supplied URL as a Markdown link.
- Format each AI item like:
  - [Article title](exact supplied URL) — concise summary
- Preserve URLs exactly.

GIT DATA:
${JSON.stringify(gitSummary, null, 2)}

WEATHER DATA:
${JSON.stringify(weatherSummary, null, 2)}

GENERAL NEWS CANDIDATES:
${JSON.stringify(newsSummary.general, null, 2)}

AI NEWS CANDIDATES:
${JSON.stringify(newsSummary.ai, null, 2)}

Remember: output exactly ## Project, ## Weather — Bremen, ## News, and ## AI News.
`;
}
