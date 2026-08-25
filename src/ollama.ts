import http from "node:http";

type OllamaChunk = {
    response?: string;
    thinking?: string;
    done?: boolean;
    error?: string;
};

export async function summarizeWithOllama(model: string, prompt: string, onToken?: (token: string) => void): Promise<string> {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            model,
            prompt,
            stream: true,
            think: false,
        });

        // http.request necessary, fetch() timed out on larger models
        const request = http.request(
            {
                hostname: "127.0.0.1",
                port: 11434,
                path: "/api/generate", //text generation endpoint
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

                let buffer = ""; // handles incomplete JSON caused by network chunking
                let result = ""; // stores the entire generated answer

                const processLine = (line: string) => {
                    if (!line.trim()) {
                        return;
                    }

                    const data = JSON.parse(line) as OllamaChunk;

                    if (data.error) {
                        throw new Error(data.error);
                    }

                    if (data.response) {
                        result += data.response;
                        onToken?.(data.response);
                    }
                };

                response.on("data", (chunk: string) => {
                    try {
                        buffer += chunk;

                        const lines = buffer.split("\n");
                        buffer = lines.pop() ?? "";

                        for (const line of lines) {
                            processLine(line);
                        }
                    } catch (error) {
                        reject(error);
                        request.destroy();
                    }
                });

                response.on("end", () => {
                    try {
                        if (buffer.trim()) {
                            processLine(buffer);
                        }

                        resolve(result); // sends the complete string accumulated in result to "briefing"
                    } catch (error) {
                        reject(error);
                    }
                });

                response.on("error", reject);
            },
        );

        request.on("error", reject);

        // Larger local models can take several minutes before producing their first token.
        request.setTimeout(0); // Don't impose a socket timeout from this request object.

        request.write(body);
        request.end();
    });
}
