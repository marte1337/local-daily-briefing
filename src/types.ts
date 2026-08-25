export type RenamedFile = {
    from: string;
    to: string;
};

export type OtherFileChange = {
    status: string;
    paths: string[];
};

export type GitCommit = {
    hash: string;
    author: string;
    date: string;
    message: string;

    addedFiles: string[];
    modifiedFiles: string[];
    deletedFiles: string[];
    renamedFiles: RenamedFile[];

    // Keeps unusual Git statuses without throwing information away.
    otherChanges: OtherFileChange[];
};

export type GitSummary = {
    repository: string;
    branch: string;
    workingTree: string;
    commits: GitCommit[];
    unstagedDiff: string;
    stagedDiff: string;
};
