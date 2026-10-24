// Compare the pinned openapi.json with the live one (https://strait.link/openapi.json).
// Fails when a secret-key operation (or recordEvent) was added, removed or moved, so this SDK gets the method
// (or loses it) before users notice. Other changes are listed but don't fail.
//   node scripts/openapi-drift.mjs [live-url]      update the pin: curl -s <url> | jq . > openapi.json
import { readFileSync } from 'node:fs';

const url = process.argv[2] ?? 'https://strait.link/openapi.json';
const pinned = JSON.parse(readFileSync(new URL('../openapi.json', import.meta.url), 'utf8'));
const res = await fetch(url, { headers: { accept: 'application/json' } });
if (!res.ok) {
  console.error(`could not fetch ${url}: HTTP ${res.status}`);
  process.exit(2);
}
const live = await res.json();

const opsOf = (spec) => {
  const out = new Map();
  for (const [path, methods] of Object.entries(spec.paths ?? {}))
    for (const [m, o] of Object.entries(methods)) {
      if (!['get', 'post', 'put', 'patch', 'delete'].includes(m)) continue;
      const secret = (o.security ?? []).some((s) => 'bearerAuth' in s) || o.operationId === 'recordEvent';
      out.set(`${m.toUpperCase()} ${path} ${o.operationId}`, secret);
    }
  return out;
};
const a = opsOf(pinned);
const b = opsOf(live);
const added = [...b.keys()].filter((k) => !a.has(k));
const removed = [...a.keys()].filter((k) => !b.has(k));
const matters = [...added.filter((k) => b.get(k)), ...removed.filter((k) => a.get(k))];
for (const k of added) console.log(`+ ${k}${b.get(k) ? '  (secret key: needs a method)' : ''}`);
for (const k of removed) console.log(`- ${k}${a.get(k) ? '  (secret key: remove or deprecate the method)' : ''}`);
if (!added.length && !removed.length) console.log(`openapi.json matches ${url} (${a.size} operations)`);
if (matters.length) {
  console.error(`\n${matters.length} secret-key operation(s) drifted: update openapi.json and src/index.ts (test/openapi-coverage.test.ts lists what is missing).`);
  process.exit(1);
}
