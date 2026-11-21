import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('archived 0.22.9 ZIP and readable JS rebuild with exact original SHA-256', () => {
  const script = fileURLToPath(new URL('../recovery/0.22.9/reassemble.mjs', import.meta.url));
  const output = execFileSync(process.execPath, [script, '--verify'], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024
  });
  assert.match(output, /VERIFIED main\.recovered\.js 8094003/);
  assert.match(output, /VERIFIED JW-Study-Desk-0\.22\.9-original\.zip 1751363/);
});
