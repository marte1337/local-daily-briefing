import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { basename } from "node:path";
import type { FileChangeStat, GitCommit, GitSummary } from "./types.js";

const execFileAsync = promisify(execFile);

async function git(repoPath: string, args: string[]): Promise<string> {
    const { stdout } = await execFileAsync("git", args, {
        cwd: repoPath,
        encoding: "utf8",
    });

    return stdout.trim();
}

function parseNumstatCount(value: string): number | null {
    if (value === "-") {
        return null;
    }

    if (!/^\d+$/.test(value)) {
        throw new Error(`Unexpected Git numstat value: ${value}`);
    }

    return Number.parseInt(value, 10);
}

function parseNumstat(output: string): FileChangeStat[] {
    const fileStats: FileChangeStat[] = [];
    let position = 0;

    while (position < output.length) {
        const entryEnd = output.indexOf("\0", position);

        if (entryEnd === -1) {
            throw new Error("Unexpected unterminated Git numstat entry");
        }

        const entry = output.slice(position, entryEnd);
        position = entryEnd + 1;

        if (!entry) {
            continue;
        }

        const firstTab = entry.indexOf("\t");
        const secondTab = entry.indexOf("\t", firstTab + 1);

        if (firstTab === -1 || secondTab === -1) {
            throw new Error(`Unexpected Git numstat entry: ${entry}`);
        }

        const additions = parseNumstatCount(entry.slice(0, firstTab));
        const deletions = parseNumstatCount(entry.slice(firstTab + 1, secondTab));
        let path = entry.slice(secondTab + 1);

        // With -z, renames and copies put the old and new paths in separate
        // NUL-terminated fields. Use the destination path for the stat entry.
        if (!path) {
            const oldPathEnd = output.indexOf("\0", position);

            if (oldPathEnd === -1) {
                throw new Error("Unexpected unterminated old path in Git numstat output");
            }

            position = oldPathEnd + 1;
            const newPathEnd = output.indexOf("\0", position);

            if (newPathEnd === -1) {
                throw new Error("Unexpected unterminated new path in Git numstat output");
            }

            path = output.slice(position, newPathEnd);
            position = newPathEnd + 1;
        }

        fileStats.push({
            path,
            additions,
            deletions,
        });
    }

    return fileStats;
}

function sumFileStat(fileStats: FileChangeStat[], field: "additions" | "deletions"): number | null {
    let total = 0;

    for (const fileStat of fileStats) {
        const value = fileStat[field];

        if (value === null) {
            return null;
        }

        total += value;
    }

    return total;
}

async function getRecentCommits(repoPath: string, since: string): Promise<GitCommit[]> {
    const output = await git(repoPath, [
        "log",
        `--since=${since}`,
        "--no-merges",
        "--find-renames",
        "--pretty=format:@@COMMIT@@%x1f%h%x1f%an%x1f%aI%x1f%s",
        "--name-status",
    ]);

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
                body: "",
                addedFiles: [],
                modifiedFiles: [],
                deletedFiles: [],
                renamedFiles: [],
                fileStats: [],
                filesChanged: 0,
                additions: 0,
                deletions: 0,
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

    for (const commit of commits) {
        const [body, numstat] = await Promise.all([
            git(repoPath, ["show", "-s", "--format=%b", commit.hash]),
            git(repoPath, ["show", "--format=", "--numstat", "-z", "--find-renames", commit.hash]),
        ]);

        commit.body = body;
        commit.fileStats = parseNumstat(numstat);
        commit.filesChanged = commit.fileStats.length;
        commit.additions = sumFileStat(commit.fileStats, "additions");
        commit.deletions = sumFileStat(commit.fileStats, "deletions");
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
        repository: basename(repoPath),
        branch,
        workingTree: status || "Clean",
        commits,
        unstagedDiff: unstagedDiff || "None",
        stagedDiff: stagedDiff || "None",
    };
}
