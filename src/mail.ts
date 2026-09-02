import { PublicClientApplication, type Configuration } from "@azure/msal-node";

import { DataProtectionScope, PersistenceCachePlugin, PersistenceCreator } from "@azure/msal-node-extensions";

import { marked } from "marked";
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const GRAPH_SCOPES = ["https://graph.microsoft.com/Mail.Send"];

function getRequiredEnv(name: string): string {
    const value = process.env[name];

    if (!value) {
        throw new Error(`Missing environment variable: ${name}`);
    }

    return value;
}

function getRecipients(): string[] {
    return getRequiredEnv("BRIEFING_RECIPIENTS")
        .split(",")
        .map((recipient) => recipient.trim())
        .filter(Boolean);
}

async function createMicrosoftClient(): Promise<PublicClientApplication> {
    const clientId = getRequiredEnv("MS_CLIENT_ID");
    const tenantId = getRequiredEnv("MS_TENANT_ID");

    const cacheDirectory = join(homedir(), ".local-daily-briefing");

    await mkdir(cacheDirectory, {
        recursive: true,
    });

    const persistence = await PersistenceCreator.createPersistence({
        cachePath: join(cacheDirectory, "msal-cache.json"),
        dataProtectionScope: DataProtectionScope.CurrentUser,
        serviceName: "Local Daily Briefing",
        accountName: "Microsoft Graph",
        usePlaintextFileOnLinux: false,
    });

    const config: Configuration = {
        auth: {
            clientId,
            authority: `https://login.microsoftonline.com/${tenantId}`,
        },
        cache: {
            cachePlugin: new PersistenceCachePlugin(persistence),
        },
    };

    return new PublicClientApplication(config);
}

async function getAccessToken(): Promise<string> {
    const client = await createMicrosoftClient();

    const accounts = await client.getAllAccounts();

    if (accounts.length > 0) {
        try {
            const result = await client.acquireTokenSilent({
                account: accounts[0],
                scopes: GRAPH_SCOPES,
            });

            return result.accessToken;
        } catch {
            console.log("Cached authentication could not be used. Login required.");
        }
    }

    const result = await client.acquireTokenByDeviceCode({
        scopes: GRAPH_SCOPES,

        deviceCodeCallback: (response) => {
            console.log("\n=== Microsoft Login ===\n");

            console.log(response.message);
        },
    });

    if (!result) {
        throw new Error("Microsoft authentication failed.");
    }

    return result.accessToken;
}

export async function sendBriefing(briefing: string): Promise<void> {
    const recipients = getRecipients();

    const accessToken = await getAccessToken();

    const html = await marked.parse(briefing);

    const response = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            message: {
                subject: "Daily Briefing",

                body: {
                    contentType: "HTML",
                    content: html,
                },

                toRecipients: recipients.map((address) => ({
                    emailAddress: {
                        address,
                    },
                })),
            },

            saveToSentItems: true,
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();

        throw new Error(`Microsoft Graph sendMail failed: ${response.status} ${response.statusText}\n${errorBody}`);
    }

    console.log(`\nBriefing sent to ${recipients.length} recipient(s).`);
}
