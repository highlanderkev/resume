# Agent Guide — Resume Pipeline

This guide explains how an AI agent can discover and interact with this repository's resume data and pipeline programmatically.

---

## Quick Discovery

The machine-readable API description lives in [`agent-manifest.json`](./agent-manifest.json) (OpenAPI 3.1 format).  
Parse it to discover all available endpoints, request/response schemas, and operation IDs.

---

## Option 1 — REST API (recommended for live interaction)

### Start the server

```bash
npm install
npm run serve:api          # default: http://localhost:3000
PORT=8080 npm run serve:api  # custom port
```

### Read the resume

```bash
curl http://localhost:3000/resume
curl http://localhost:3000/resume/skills
curl http://localhost:3000/resume/work
curl http://localhost:3000/resume/education
```

### Update resume fields (deep merge)

```bash
curl -X POST http://localhost:3000/resume \
  -H 'Content-Type: application/json' \
  -d '{"basics":{"summary":"Updated summary written by an AI agent."}}'
```

The response includes `{ ok, validation, resume }` — `validation.valid` tells you whether the result passed `resume validate`.

### Update with surgical precision (JSON Patch — RFC 6902)

```bash
curl -X POST http://localhost:3000/resume/patch \
  -H 'Content-Type: application/json' \
  -d '[
    {"op":"replace","path":"/basics/summary","value":"Precise replacement."},
    {"op":"add","path":"/skills/-","value":{"name":"AI Tools","keywords":["LangChain","OpenAI","Copilot"]}}
  ]'
```

### Run the extraction pipeline

```bash
curl -X POST http://localhost:3000/pipeline/run
```

### Get last pipeline results

```bash
curl http://localhost:3000/pipeline/status
```

### Health check

```bash
curl http://localhost:3000/health
```

---

## Option 2 — Programmatic (Node.js / TypeScript)

```js
const { ResumeExtractor, ResumeParser, PipelineOrchestrator } = require('./index.js');

// Read resume directly
const resume = require('./resume.json');

// Run the pipeline
const orchestrator = new PipelineOrchestrator();
const analysis = await orchestrator.run();

// Run extraction only
const extractor = new ResumeExtractor({ quiet: true });
await extractor.run();
const { pdf, txt, metadata } = extractor.extractedData;

// Parse extracted data
const parser = new ResumeParser();
const parsed = parser.parseResumes(extractor.extractedData);
```

---

## Option 3 — CLI with machine-readable output

All pipeline CLI commands support `--json` for machine-parseable output and `--output <file>` to write results to a file.

```bash
# Run pipeline, get JSON on stdout
node pipeline.js --json

# Run pipeline, write results to a file
node pipeline.js --json --output /tmp/results.json

# Extract only
node extract-resumes.js --json --output /tmp/extracted.json
```

Exit codes:
- `0` — success
- `1` — pipeline error

---

## Option 4 — GitHub Actions (remote/CI trigger)

### Trigger a resume update via GitHub API

```bash
curl -X POST \
  -H "Authorization: ******" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/highlanderkev/resume/actions/workflows/update-resume.yml/dispatches \
  -d '{
    "ref": "main",
    "inputs": {
      "patch": "[{\"op\":\"replace\",\"path\":\"/basics/summary\",\"value\":\"AI-generated summary.\"}]"
    }
  }'
```

The workflow will:
1. Apply the patch to `resume.json`
2. Run `resume validate`
3. Export updated HTML/PDF
4. Commit and push changes

### Trigger the extraction pipeline

```bash
curl -X POST \
  -H "Authorization: ******" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/highlanderkev/resume/actions/workflows/pipeline.yml/dispatches \
  -d '{"ref":"main"}'
```

---

## Data formats

| Resource | Format | Schema |
|----------|--------|--------|
| `resume.json` | JSON Resume | https://jsonresume.org/schema/ |
| `extracted_data/analysis.json` | Custom JSON | See `agent-manifest.json` → `PipelineAnalysis` |
| `extracted_data/parsed_resumes.json` | Array of parsed resume objects | See `agent-manifest.json` → `Resume` |
| `agent-manifest.json` | OpenAPI 3.1 | https://spec.openapis.org/oas/v3.1.0 |

---

## Recommended agent workflow

```
1. GET /health              → confirm server is up
2. GET /resume              → read current resume data
3. POST /resume/patch       → apply targeted updates
4. (check validation.valid in response)
5. POST /pipeline/run       → refresh extracted analysis if needed
6. GET /pipeline/status     → read analysis results
```

Or, for a fully offline/CI workflow:
```
1. Clone repo
2. npm install && npm run serve:api &
3. Interact via HTTP as above
4. git commit && git push (or open a PR)
```
