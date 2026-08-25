import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { GitCommit, GitSummary } from "./types.js";

const execFileAsync = promisify(execFile);

async function git(repoPath: string, args: string[]): Promise<string> {
    const { stdout } = await execFileAsync("git", args, {
        cwd: repoPath,
        encoding: "utf8",
    });

    return stdout.trim();
}

async function getRecentCommits(repoPath: string, since: string): Promise<GitCommit[]> {
    const output = await git(repoPath, ["log", `--since=${since}`, "--no-merges", "--pretty=format:@@COMMIT@@%x1f%h%x1f%an%x1f%aI%x1f%s", "--name-status"]);

    if (!output) {
        return [];
    }

    const commits: GitCommit[] = [];
    let currentCommit: GitCommit | undefined;

    for (const line of output.split(/\r?\n/)) {
        if (line.startsWith("@@COMMIT@@")) {
            const [, hash, author, date, message] = line.split("\x1f");

            currentCommit = {
                hash,
                author,
                date,
                message,
                addedFiles: [],
                modifiedFiles: [],
                deletedFiles: [],
                renamedFiles: [],
                otherChanges: [],
            };

            commits.push(currentCommit);
            continue;
        }

        if (!currentCommit || !line.trim()) {
            continue;
        }

        const [status, ...paths] = line.split("\t");

        if (!status || paths.length === 0) {
            continue;
        }

        if (status === "A") {
            currentCommit.addedFiles.push(paths[0]);
            continue;
        }

        if (status === "M") {
            currentCommit.modifiedFiles.push(paths[0]);
            continue;
        }

        if (status === "D") {
            currentCommit.deletedFiles.push(paths[0]);
            continue;
        }

        if (status.startsWith("R") && paths.length >= 2) {
            currentCommit.renamedFiles.push({
                from: paths[0],
                to: paths[1],
            });
            continue;
        }

        currentCommit.otherChanges.push({
            status,
            paths,
        });
    }

    return commits;
}

export async function getGitSummary(repoPath: string, since = "7 days ago"): Promise<GitSummary> {
    const branch = await git(repoPath, ["rev-parse", "--abbrev-ref", "HEAD"]);

    const status = await git(repoPath, ["status", "--short"]);

    const commits = await getRecentCommits(repoPath, since);

    const unstagedDiff = await git(repoPath, ["diff", "--stat"]);

    const stagedDiff = await git(repoPath, ["diff", "--cached", "--stat"]);

    return {
        repository: repoPath,
        branch,
        workingTree: status || "Clean",
        commits,
        unstagedDiff: unstagedDiff || "None",
        stagedDiff: stagedDiff || "None",
    };
}
