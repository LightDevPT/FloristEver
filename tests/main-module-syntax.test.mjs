import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

test('the browser entry module parses as an ES module', () => {
  const mainModulePath = fileURLToPath(new URL('../js/main.js', import.meta.url));
  const result = spawnSync(process.execPath, [
    '--experimental-default-type=module',
    '--check',
    mainModulePath
  ], { encoding: 'utf8' });

  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
});
