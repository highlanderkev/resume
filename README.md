# Resume Repo

Repo for [JSON Resume](https://github.com/jsonresume/resume-cli)

## AI Agent Pipeline

This repo ships a streamlined pipeline that AI agents can use to read, update, and process the resume data.  
See **[AGENT_GUIDE.md](./AGENT_GUIDE.md)** for full instructions.

**Quick start (REST API):**
```bash
npm install
npm run serve:api   # http://localhost:3000
```

**API manifest (OpenAPI 3.1):** [`agent-manifest.json`](./agent-manifest.json)

## Validate resume.json

```
$ resume validate
```
or
```
$ npm run validate
```

## Pipeline commands

| Command | Description |
|---------|-------------|
| `npm run pipeline` | Run full extraction pipeline |
| `npm run pipeline:full` | Clean run (removes old output first) |
| `npm run pipeline:json` | Run pipeline, output machine-readable JSON |
| `npm run serve:api` | Start REST API server on port 3000 |
| `npm run extract` | Extract raw data only |
| `npm run parse` | Parse extracted data only |

See [PIPELINE.md](./PIPELINE.md) for detailed pipeline documentation.

## SaaS Links for generating Resume

- [resumetrick.com](https://resumetrick.com)
- [resume.io](https://resume.io)
