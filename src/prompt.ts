import type { GitSummary, WeatherSummary } from "./types.js";

export function buildDailyBriefingPrompt(gitSummary: GitSummary, weatherSummary: WeatherSummary): string {
    return `
You are preparing a concise developer morning briefing from structured Git repository data and structured weather data.

Produce exactly these two sections in this order:

## Project

## Weather — Bremen

Project grounding rules:
- Only use information directly supported by the supplied Git data.
- Treat each commit as an independent evidence unit.
- When describing a specific commit, only use its message, body, file lists, fileStats, and supplied totals as evidence.
- The supplied timestamps are authoritative.
- Never invent relative dates such as "today", "yesterday", "this morning", or similar phrases.
- Never claim a timestamp is anomalous, future-dated, or incorrect unless the supplied Git data explicitly says so.
- Never attribute a file addition from one commit to another commit.
- If a file was added in an earlier commit and modified in a later commit, distinguish those two events.
- "addedFiles" means the file itself was created in that commit.
- "modifiedFiles" means the file already existed and was changed in that commit.
- "deletedFiles" means the file was deleted in that commit.
- "renamedFiles" means the file was renamed in that commit.
- "fileStats" contains per-file additions and deletions from Git numstat.
- A null additions or deletions value means Git reported a non-numeric value, such as for a binary file.
- Use filesChanged, additions, and deletions exactly as supplied.
- Never calculate, estimate, or derive change totals yourself.
- Line counts indicate change size only.
- Do not infer importance, complexity, implementation quality, architecture, performance, or user impact from line counts alone.
- A commit may integrate or use an existing component without creating that component.
- Do not invent behavior, intent, impact, causes, or technical details that are not explicitly established.
- Do not infer functionality purely from filenames.
- Do not infer what vague commit messages mean.
- If evidence is vague, preserve that uncertainty instead of filling it in.
- Do not describe something as a refactor unless the commit message explicitly establishes that.
- Do not describe something as a performance improvement unless the commit message explicitly establishes that.
- Do not infer causal relationships between separate commits unless their commit messages explicitly establish one.
- Do not invent that one feature caused later fixes or optimizations.
- Avoid words such as "major", "robust", "significant", "substantial", or "heavy" unless directly justified by explicit commit wording.
- Do not include recommendations, offers, follow-up questions, next steps, suggestions, or actions.
- Do not end with "Would you like me to..." or any similar invitation.
- Group related commits only when there is clear evidence that they concern the same area of work.
- When grouping commits, do not mix file changes from one commit into the description of another.
- Mention features, fixes, optimizations, and repeated areas of work only when explicitly supported by the commit evidence.
- Prefer a concise thematic morning briefing, not a commit table or changelog.
- Keep the briefing concise.
- Avoid repeating the same commit in multiple sections.
- Mention the current branch and working-tree state.
- Preserve file paths exactly if you mention them.
- Do not invent shortened, alternative, or normalized file paths.
- Do not include a separate raw commit list unless it adds useful information beyond the summary.

Weather grounding rules:
- Treat the supplied weather values as authoritative.
- Do not invent weather values.
- Do not calculate additional meteorological values.
- Do not change temperatures, wind speeds, or precipitation probabilities.
- Temperature values are in degrees Celsius, wind speed is in kilometers per hour, and precipitation probability is a percentage.
- Do not infer an exact time for rain or thunderstorms because the supplied data does not contain hourly timing.
- Do not claim that rain or a thunderstorm will definitely occur solely from precipitation probability.
- Distinguish current conditions from today's overall forecast.
- "currentCondition" describes current conditions.
- "today.condition" describes the day's overall weather condition.
- "today.precipitationProbability" is the maximum precipitation probability for the day.
- Do not confuse precipitation probability with expected rainfall amount.
- Keep the weather summary concise and practical.
- A simple interpretation such as "there is a high chance of precipitation" is acceptable when supported by the supplied probability.
- Do not add detailed safety advice, recommendations, or unsupported predictions.

Structured Git data:

${JSON.stringify(gitSummary, null, 2)}

Structured weather data:

${JSON.stringify(weatherSummary, null, 2)}
`;
}
