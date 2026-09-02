import type { GitSummary, NewsSummary, WeatherSummary } from "./types.js";

export function buildDailyBriefingPrompt(gitSummary: GitSummary | null, weatherSummary: WeatherSummary | null, newsSummary: NewsSummary | null): string {
    const gitData = gitSummary
        ? {
              repository: gitSummary.repository,
              branch: gitSummary.branch,
              workingTree: gitSummary.workingTree,

              commits: gitSummary.commits.map((commit) => ({
                  hash: commit.hash,
                  author: commit.author,
                  date: commit.date,
                  message: commit.message,
                  body: commit.body || undefined,
                  addedFiles: commit.addedFiles,
                  modifiedFiles: commit.modifiedFiles,
                  deletedFiles: commit.deletedFiles,
                  renamedFiles: commit.renamedFiles,
                  filesChanged: commit.filesChanged,
                  additions: commit.additions,
                  deletions: commit.deletions,
              })),

              activeBranches: gitSummary.activeBranches.map((branch) => ({
                  name: branch.name,
                  commitsAhead: branch.commitsAhead,
                  lastCommitDate: branch.lastCommitDate,
                  author: branch.author,
                  unmergedCommits: branch.unmergedCommits,
              })),

              unstagedDiff: gitSummary.unstagedDiff,
              stagedDiff: gitSummary.stagedDiff,
          }
        : null;

    const generalNewsData = newsSummary
        ? newsSummary.general.map((item) => ({
              englishTitle: item.englishTitle ?? item.title,
              url: item.url,
              summary: item.summary,
          }))
        : null;

    const aiNewsData = newsSummary
        ? newsSummary.ai.map((item) => ({
              title: item.title,
              url: item.url,
              summary: item.summary,
              section: item.section,
          }))
        : null;

    console.log("\n=== JSON Data ===\n");
    console.log(gitData, weatherSummary, generalNewsData, aiNewsData);

    return `
Create a concise English morning briefing using only the supplied data.

OUTPUT EXACTLY:

## Next.js Project
### Main branch
### Active unmerged branches

## Weather in Bremen

## General News

## AI News

Do not add an introduction, conclusion, key takeaway, recommendations, or questions.

GENERAL:
- Use only facts supported by the supplied data.
- Do not invent causes, consequences, technical details, or predictions.
- Keep the briefing concise but informative.
- If data for a section is UNAVAILABLE, say so briefly and continue.

PROJECT:
- Keep main-branch work and unmerged remote-branch work clearly separate.
- For Main branch, state repository, branch and working-tree state, then summarize recent work by topic.
- Group related commits, but keep unrelated work distinct.
- Never calculate combined commit counts, file counts, additions, or deletions across multiple commits.
- Mention components/files when useful.
- Treat each commit independently and do not infer behavior from filenames alone.
- Supplied Git statistics are authoritative; do not calculate new totals.
- For each active branch, mention its name, commits ahead of main, and summarize its unmerged commits.
- Do not describe unmerged branch work as already present on main.
- Do not infer whether a branch is finished, approved, abandoned, or ready to merge.
- If there are no active branches, say so.

WEATHER:
- windSpeed is measured in km/h.
- Temperatures are measured in °C.
- Distinguish current conditions from today's forecast.
- Use supplied values exactly.
- Precipitation probability is not rainfall amount.
- Do not invent hourly timing or guarantee precipitation.
- Keep this section short.

GENERAL NEWS:
- Select 4-5 of the most important candidates.
- Prioritize significant German, European, international, economic and geopolitical stories.
- Deprioritize sports, entertainment, local crime and human-interest stories unless broadly significant.
- Use englishTitle EXACTLY as the Markdown link label.
- Translate/summarize the supplied German summary into one concise English sentence.
- Preserve the supplied URL exactly.
- Format:
  - [englishTitle](URL) — concise English summary

AI NEWS:
- Select 4-5 of the most useful candidates.
- Prioritize models, developer tooling, APIs, local/open-weight AI, inference and meaningful research.
- Summarize each item in one concise sentence without strengthening the source claim.
- Preserve the supplied title and URL.
- Format:
  - [Article title](URL) — concise summary

GIT DATA:
${gitData ? JSON.stringify(gitData) : "UNAVAILABLE"}

WEATHER DATA:
${weatherSummary ? JSON.stringify(weatherSummary) : "UNAVAILABLE"}

GENERAL NEWS CANDIDATES:
${generalNewsData ? JSON.stringify(generalNewsData) : "UNAVAILABLE"}

AI NEWS CANDIDATES:
${aiNewsData ? JSON.stringify(aiNewsData) : "UNAVAILABLE"}
`;
}
