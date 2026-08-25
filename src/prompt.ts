import type { GitSummary } from "./types.js";

export function buildGitBriefingPrompt(summary: GitSummary): string {
    return `
You are preparing a concise developer morning briefing from structured Git repository data.

Summarize the repository activity supplied below.

Rules:
- Only use information directly supported by the supplied Git data.
- Treat each commit as an independent evidence unit.
- When describing a specific commit, only use its message and its own file lists as evidence.
- Never attribute a file addition from one commit to another commit.
- If a file was added in an earlier commit and modified in a later commit, distinguish those two events.
- "addedFiles" means the file itself was created in that commit.
- "modifiedFiles" means the file already existed and was changed in that commit.
- "deletedFiles" means the file was deleted in that commit.
- "renamedFiles" means the file was renamed in that commit.
- A commit may integrate or use an existing component without creating that component.
- Do not invent behavior, intent, impact, causes, or technical details that are not explicitly established.
- Do not infer functionality purely from filenames.
- Do not infer what vague commit messages mean.
- If a commit message is vague, say so rather than guessing.
- Do not describe something as a refactor unless the commit message explicitly establishes that.
- Do not describe something as a performance improvement unless the commit message explicitly establishes that.
- Do not include recommendations, next steps, suggestions, or actions.
- Group related commits only when there is clear evidence that they concern the same area of work.
- When grouping commits, do not mix file changes from one commit into the description of another.
- Highlight notable new features, fixes, optimizations, and repeated areas of work.
- Prefer a thematic summary instead of rewriting every commit individually.
- Keep the briefing concise.
- Avoid repeating the same commit in multiple sections.
- Mention the current branch and working-tree state.
- Preserve file paths exactly if you mention them.
- Do not invent shortened, alternative, or normalized file paths.
- Do not include a separate raw commit list unless it adds useful information beyond the summary.

Structured Git data:

${JSON.stringify(summary, null, 2)}
`;
}
