export type RenamedFile = {
    from: string;
    to: string;
};

export type OtherFileChange = {
    status: string;
    paths: string[];
};

export type FileChangeStat = {
    path: string;
    additions: number | null;
    deletions: number | null;
};

export type GitCommit = {
    hash: string;
    author: string;
    date: string;
    message: string;
    body: string;

    addedFiles: string[];
    modifiedFiles: string[];
    deletedFiles: string[];
    renamedFiles: RenamedFile[];
    fileStats: FileChangeStat[];
    filesChanged: number;
    additions: number | null;
    deletions: number | null;

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

export type WeatherSummary = {
    location: string;
    currentTemperature: number;
    apparentTemperature: number;
    currentCondition: string;
    windSpeed: number;
    today: {
        minTemperature: number;
        maxTemperature: number;
        precipitationProbability: number;
        condition: string;
    };
};
