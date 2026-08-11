#!/usr/bin/env node

/**
 * Resume Pipeline REST API Server
 *
 * Exposes the resume data and pipeline as HTTP endpoints for AI agents.
 *
 * Endpoints:
 *   GET  /resume              - Full resume.json
 *   GET  /resume/skills       - Skills section only
 *   GET  /resume/work         - Work experience section only
 *   GET  /resume/education    - Education section only
 *   POST /resume              - Replace resume.json (full or partial merge)
 *   POST /resume/patch        - Apply a JSON Patch (RFC 6902) to resume.json
 *   POST /pipeline/run        - Trigger extraction pipeline and return results
 *   GET  /pipeline/status     - Last pipeline run results
 *   GET  /health              - Health check
 */

'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');

const RESUME_PATH = path.join(__dirname, 'resume.json');
const STATUS_PATH = path.join(__dirname, 'extracted_data', 'analysis.json');
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readResume() {
  return JSON.parse(fs.readFileSync(RESUME_PATH, 'utf-8'));
}

function writeResume(data) {
  fs.writeFileSync(RESUME_PATH, JSON.stringify(data, null, 2) + '\n');
}

function json(res, status, body) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const MAX_BODY_BYTES = 1024 * 1024; // 1 MiB
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (Buffer.byteLength(data) > MAX_BODY_BYTES) {
        req.destroy();
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Apply a JSON Patch (RFC 6902) document to a target object.
 * Supports: add, remove, replace, copy, move, test operations.
 */
function applyJsonPatch(doc, patch) {
  const target = JSON.parse(JSON.stringify(doc)); // deep clone

  function getPointer(obj, pointer) {
    if (pointer === '') throw new Error('Root JSON Pointer "" is not supported');
    const parts = pointer.replace(/^\//, '').split('/').map(p => p.replace(/~1/g, '/').replace(/~0/g, '~'));
    if (parts.some(p => p === '__proto__' || p === 'constructor' || p === 'prototype')) {
      throw new Error(`Disallowed path segment in pointer: ${pointer}`);
    }
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      cur = cur[parts[i]];
      if (cur == null) throw new Error(`Path not found: ${pointer}`);
    }
    return { parent: cur, key: parts[parts.length - 1] };
  }

  for (const op of patch) {
    const { path: ptr, from, value } = op;
    switch (op.op) {
      case 'add': {
        const { parent, key } = getPointer(target, ptr);
        if (Array.isArray(parent)) {
          const idx = key === '-' ? parent.length : Number(key);
          if (!Number.isInteger(idx) || idx < 0 || idx > parent.length) throw new Error(`Invalid array index: ${ptr}`);
          parent.splice(idx, 0, value);
        } else {
          parent[key] = value;
        }
        break;
      }
      case 'remove': {
        const { parent, key } = getPointer(target, ptr);
        if (Array.isArray(parent)) parent.splice(parseInt(key, 10), 1);
        else delete parent[key];
        break;
      }
      case 'replace': {
        const { parent, key } = getPointer(target, ptr);
        parent[key] = value;
        break;
      }
      case 'copy': {
        const src = getPointer(target, from);
        const dst = getPointer(target, ptr);
        dst.parent[dst.key] = JSON.parse(JSON.stringify(src.parent[src.key]));
        break;
      }
      case 'move': {
        const src = getPointer(target, from);
        const val = src.parent[src.key];
        if (Array.isArray(src.parent)) src.parent.splice(parseInt(src.key, 10), 1);
        else delete src.parent[src.key];
        const dst = getPointer(target, ptr);
        dst.parent[dst.key] = val;
        break;
      }
      case 'test': {
        const { parent, key } = getPointer(target, ptr);
        if (JSON.stringify(parent[key]) !== JSON.stringify(value)) {
          throw new Error(`Test failed at ${ptr}`);
        }
        break;
      }
      default:
        throw new Error(`Unknown patch op: ${op.op}`);
    }
  }

  return target;
}

/** Deep merge: source fields overwrite target, nested objects are merged recursively. */
function deepMerge(target, source) {
  const output = Object.assign({}, target);
  for (const key of Object.keys(source)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      output[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      output[key] = source[key];
    }
  }
  return output;
}

function validateResume() {
  try {
    execSync('npm run validate', { cwd: __dirname, stdio: 'pipe' });
    return { valid: true };
  } catch (e) {
    return { valid: false, error: e.stderr ? e.stderr.toString() : e.message };
  }
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://localhost`);
  const pathname = url.pathname.replace(/\/$/, '') || '/';
  const method = req.method.toUpperCase();

  try {
    // GET /health
    if (method === 'GET' && pathname === '/health') {
      return json(res, 200, { status: 'ok', timestamp: new Date().toISOString() });
    }

    // GET /resume
    if (method === 'GET' && pathname === '/resume') {
      return json(res, 200, readResume());
    }

    // GET /resume/skills
    if (method === 'GET' && pathname === '/resume/skills') {
      return json(res, 200, readResume().skills || []);
    }

    // GET /resume/work
    if (method === 'GET' && pathname === '/resume/work') {
      return json(res, 200, readResume().work || []);
    }

    // GET /resume/education
    if (method === 'GET' && pathname === '/resume/education') {
      return json(res, 200, readResume().education || []);
    }

    // POST /resume  — deep-merge body into resume.json
    if (method === 'POST' && pathname === '/resume') {
      const body = await readBody(req);
      const merged = deepMerge(readResume(), body);
      writeResume(merged);
      const validation = validateResume();
      return json(res, 200, { ok: true, validation, resume: merged });
    }

    // POST /resume/patch  — apply RFC 6902 JSON Patch array
    if (method === 'POST' && pathname === '/resume/patch') {
      const body = await readBody(req);
      if (!Array.isArray(body)) {
        return json(res, 400, { ok: false, error: 'Body must be a JSON Patch array (RFC 6902)' });
      }
      const patched = applyJsonPatch(readResume(), body);
      writeResume(patched);
      const validation = validateResume();
      return json(res, 200, { ok: true, validation, resume: patched });
    }

    // POST /pipeline/run
    if (method === 'POST' && pathname === '/pipeline/run') {
      const PipelineOrchestrator = require('./pipeline.js');
      const orchestrator = new PipelineOrchestrator();
      await orchestrator.run();
      const status = fs.existsSync(STATUS_PATH)
        ? JSON.parse(fs.readFileSync(STATUS_PATH, 'utf-8'))
        : null;
      return json(res, 200, { ok: true, results: status });
    }

    // GET /pipeline/status
    if (method === 'GET' && pathname === '/pipeline/status') {
      if (!fs.existsSync(STATUS_PATH)) {
        return json(res, 404, { ok: false, error: 'No pipeline run found. POST /pipeline/run first.' });
      }
      return json(res, 200, JSON.parse(fs.readFileSync(STATUS_PATH, 'utf-8')));
    }

    return json(res, 404, { ok: false, error: `No route: ${method} ${pathname}` });

  } catch (err) {
    const isClientError =
      err.message === 'Invalid JSON body' ||
      err.message.startsWith('Path not found:') ||
      err.message.startsWith('Unknown patch op:') ||
      err.message.startsWith('Test failed at ');
    const status = err.message === 'Request body too large' ? 413 : isClientError ? 400 : 500;
    return json(res, status, { ok: false, error: err.message });
  }
}

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

const HOST = process.env.HOST || '127.0.0.1';
const server = http.createServer(handleRequest);

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log(`Resume Pipeline API listening on http://${HOST}:${PORT}`);
    console.log('Endpoints:');
    console.log('  GET  /health');
    console.log('  GET  /resume');
    console.log('  GET  /resume/skills');
    console.log('  GET  /resume/work');
    console.log('  GET  /resume/education');
    console.log('  POST /resume              (deep-merge body)');
    console.log('  POST /resume/patch        (RFC 6902 JSON Patch)');
    console.log('  POST /pipeline/run');
    console.log('  GET  /pipeline/status');
  });
}

module.exports = server;
