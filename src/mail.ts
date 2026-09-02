import { PublicClientApplication, type Configuration } from "@azure/msal-node";
import { marked } from "marked";

function getRequiredEnv(name: string): string {
    const value = process.env[name];

    if (!value) {
        throw new Error(`Missing environment variable: ${name}`);
    }

    return value;
}

async function getAccessToken(): Promise<string> {
    const clientId = getRequiredEnv("MS_CLIENT_ID");
    const tenantId = getRequiredEnv("MS_TENANT_ID");

    const config: Configuration = {
        auth: {
            clientId,
            authority: `https://login.microsoftonline.com/${tenantId}`,
        },
    };

    const client = new PublicClientApplication(config);

    const result = await client.acquireTokenByDeviceCode({
        scopes: ["https://graph.microsoft.com/Mail.Send"],

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
    const recipient = getRequiredEnv("BRIEFING_RECIPIENT");

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
                toRecipients: [
                    {
                        emailAddress: {
                            address: recipient,
                        },
                    },
                ],
            },
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();

        throw new Error(`Microsoft Graph sendMail failed: ${response.status} ${response.statusText}\n${errorBody}`);
    }

    console.log("\nBriefing email sent successfully.");
}
