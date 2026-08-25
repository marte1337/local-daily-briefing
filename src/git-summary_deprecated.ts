import { execFile } from "node:child_process";
import { promisify } from "node:util";
import http from "node:http";

async function summarizeWithOllama(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            model: "qwen3.5:9b",
            prompt,
            stream: true,
            think: false,
        });

        const request = http.request(
            {
                hostname: "127.0.0.1",
                port: 11434,
                path: "/api/generate",
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Content-Length": Buffer.byteLength(body),
                },
            },
            (response) => {
                if (response.statusCode === undefined || response.statusCode < 200 || response.statusCode >= 300) {
                    reject(new Error(`Ollama request failed: ${response.statusCode}`));
                    return;
                }

                response.setEncoding("utf8");

                let buffer = "";
                let result = "";

                response.on("data", (chunk: string) => {
                    buffer += chunk;

                    const lines = buffer.split("\n");
                    buffer = lines.pop() ?? "";

                    for (const line of lines) {
                        if (!line.trim()) {
                            continue;
                        }

                        const data = JSON.parse(line) as {
                            response?: string;
                            done?: boolean;
                        };

                        if (data.response) {
                            result += data.response;
                            process.stdout.write(data.response);
                        }
                    }
                });

                response.on("end", () => {
                    if (buffer.trim()) {
                        const data = JSON.parse(buffer) as {
                            response?: string;
                        };

                        if (data.response) {
                            result += data.response;
                            process.stdout.write(data.response);
                        }
                    }

                    resolve(result);
                });

                response.on("error", reject);
            },
        );

        request.on("error", reject);

        // No client-side socket timeout.
        request.setTimeout(0);

        request.write(body);
        request.end();
    });
}

const execFileAsync = promisify(execFile);

async function git(repoPath: string, args: string[]) {
    const { stdout } = await execFileAsync("git", args, {
        cwd: repoPath,
        encoding: "utf8",
    });

    return stdout.trim();
}

async function main() {
    const repoPath = process.argv[2];

    if (!repoPath) {
        throw new Error("Please provide a repository path.");
    }

    const branch = await git(repoPath, ["rev-parse", "--abbrev-ref", "HEAD"]);

    const status = await git(repoPath, ["status", "--short"]);

    const commits = await git(repoPath, ["log", "--since=7 days ago", "--no-merges", "--date=iso", "--pretty=format:%h | %an | %ad | %s", "--name-status"]);

    const diffStat = await git(repoPath, ["diff", "--stat"]);

    console.log("=== Git Summary ===");
    console.log(`Repository: ${repoPath}`);
    console.log(`Branch: ${branch}`);

    console.log("\n--- Working Tree ---");
    console.log(status || "Clean");

    console.log("\n--- Commits in last 7 days ---");
    console.log(commits || "No commits");

    console.log("\n--- Uncommitted Diff ---");
    console.log(diffStat || "No unstaged changes");

    const prompt = `
You are preparing a concise developer morning briefing from Git repository data.

Summarize the repository activity below.

Rules:
- Only use information directly supported by the supplied Git data.
- Do not invent behavior, intent, impact, causes, or technical details that are not explicitly established.
- Do not include recommendations, next steps, suggestions, or actions.
- Do not describe something as an improvement unless the commit message explicitly says so.
- Do not infer what vague commit messages mean.
- If a commit message is vague, say that it is vague rather than guessing.
- Group related commits together when there is clear evidence they belong to the same area of work.
- Highlight notable new features, fixes, optimizations, and repeated areas of work.
- Distinguish between files that were added and files that were only modified.
- Do not claim that a component or feature was introduced if the Git data only shows that an existing file was modified.
- Avoid repeating the same commit in multiple sections.
- Keep the briefing concise and useful.
- Mention the current branch and whether the working tree is clean.
- Prefer a short thematic summary over a commit-by-commit rewrite.
- Do not include information that could already be read directly from the Git log unless it helps explain a broader theme.

Repository: ${repoPath}
Branch: ${branch}

Working tree:
${status || "Clean"}

Commits:
${commits || "No commits"}

Uncommitted changes:
${diffStat || "No unstaged changes"}
`;

    console.log("\n=== AI Git Briefing ===\n");

    const briefing = await summarizeWithOllama(prompt);

    // Keep `briefing` available for later email delivery,
    // but don't print it again.
    console.log();
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
