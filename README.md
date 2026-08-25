# Local Daily Briefing

Small proof-of-concept that collects recent Git activity from a local repository and asks a local Ollama model to turn it into a concise developer morning briefing.

## Prerequisites

- Node.js 20+
- Git
- Ollama

## Initial setup

```powershell
mkdir local-daily-briefing
cd local-daily-briefing

npm init -y
npm install -D typescript tsx @types/node
```

## Project structure

```text
src/
├─ index.ts
├─ git.ts
├─ ollama.ts
├─ prompt.ts
└─ types.ts
```

## Run the briefing

Pass the repository path and, optionally, the Ollama model:

```powershell
npx tsx src/index.ts "D:\develop\next-wk\nextjs" qwen3.5:9b
```

Other models can be tested with the same input:

```powershell
npx tsx src/index.ts "D:\develop\next-wk\nextjs" llama3.1:8b
npx tsx src/index.ts "D:\develop\next-wk\nextjs" qwen3.5:4b
npx tsx src/index.ts "D:\develop\next-wk\nextjs" gemma4:12b
```

If no model is supplied, the current code defaults to:

```text
qwen3.5:9b
```

## Useful Ollama commands

Show installed models:

```powershell
ollama list
```

Download a model:

```powershell
ollama pull qwen3.5:9b
ollama pull llama3.1:8b
```

Show models currently loaded in memory:

```powershell
ollama ps
```

Unload a model:

```powershell
ollama stop qwen3.5:9b
```

Remove a downloaded model:

```powershell
ollama rm qwen3.5:9b
```

Run a model interactively:

```powershell
ollama run qwen3.5:9b
```

## Useful Git check

To verify the repository has recent non-merge commits:

```powershell
git -C "D:\develop\next-wk\nextjs" log --since="7 days ago" --oneline --no-merges
```

## Current PoC flow

```text
Local Git repository
        ↓
Structured Git data
        ↓
Prompt
        ↓
Ollama local API
        ↓
Local AI model
        ↓
Developer briefing
```

The next planned steps are to add other daily-briefing inputs such as weather and news/RSS, and later deliver the generated briefing automatically.
