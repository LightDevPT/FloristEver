import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const releaseDirectory = join(root, 'release');
const version = packageJson.version;
const isWindows = process.platform === 'win32';

if (!isWindows) {
  throw new Error('The Windows EXE build must run on Windows.');
}

function runNpmScript(script, devMode) {
  const result = spawnSync('npm.cmd', ['run', script], {
    cwd: root,
    env: { ...process.env, FLORESTEVER_DEV_BUILD: devMode ? '1' : '0' },
    shell: true,
    stdio: 'inherit'
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`npm run ${script} failed with exit code ${result.status}.`);
  }
}

function moveFreshArtifact(source, destination) {
  if (!existsSync(source)) throw new Error(`Build output is missing: ${source}`);
  if (existsSync(destination)) throw new Error(`Refusing to overwrite existing artifact: ${destination}`);
  renameSync(source, destination);
}

function copyFreshArtifact(source, destination) {
  if (!existsSync(source)) throw new Error(`Build output is missing: ${source}`);
  if (existsSync(destination)) throw new Error(`Refusing to overwrite existing artifact: ${destination}`);
  copyFileSync(source, destination);
}

function sha256(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

mkdirSync(releaseDirectory, { recursive: true });

const androidApk = join(root, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const windowsExe = join(releaseDirectory, `FloristEver-${version}-x64.exe`);
const artifacts = [];

for (const devMode of [false, true]) {
  runNpmScript('android:apk:debug', devMode);
  const androidSuffix = devMode ? '-Android-DEV.apk' : '-Android.apk';
  const androidDestination = join(releaseDirectory, `FloristEver-${version}${androidSuffix}`);
  copyFreshArtifact(androidApk, androidDestination);
  artifacts.push(androidDestination);

  runNpmScript('win:pack', devMode);
  const windowsSuffix = devMode ? '-Windows-DEV-x64.exe' : '-Windows-x64.exe';
  const windowsDestination = join(releaseDirectory, `FloristEver-${version}${windowsSuffix}`);
  moveFreshArtifact(windowsExe, windowsDestination);
  artifacts.push(windowsDestination);
}

runNpmScript('android:sync', false);

const checksums = artifacts.map((filePath) => `${sha256(filePath)}  ${filePath.slice(releaseDirectory.length + 1)}`);
const checksumPath = join(releaseDirectory, `SHA256SUMS-${version}.txt`);
if (existsSync(checksumPath)) throw new Error(`Refusing to overwrite existing checksums: ${checksumPath}`);
writeFileSync(checksumPath, `${checksums.join('\n')}\n`, 'utf8');

console.log(`Release artifacts created for ${version}:`);
for (const filePath of artifacts) {
  console.log(`${filePath} (${sha256(filePath)})`);
}
console.log(`Checksums: ${checksumPath}`);
