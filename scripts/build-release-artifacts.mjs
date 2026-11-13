import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const version = packageJson.version;
const releaseDirectory = join(root, 'release', version);
const buildDirectory = join(releaseDirectory, '.build');
const checksumPath = join(releaseDirectory, 'SHA256SUMS.txt');
const readmePath = join(releaseDirectory, 'README.txt');
const isWindows = process.platform === 'win32';

if (!isWindows) {
  throw new Error('The Windows EXE build must run on Windows.');
}
if (existsSync(buildDirectory)) {
  throw new Error(`Refusing to overwrite temporary build directory: ${buildDirectory}`);
}
if (existsSync(checksumPath)) throw new Error(`Refusing to overwrite checksums: ${checksumPath}`);
if (existsSync(readmePath)) throw new Error(`Refusing to overwrite release notes: ${readmePath}`);

function runNpmScript(script, devMode, extraArgs = []) {
  const args = ['run', script];
  if (extraArgs.length > 0) args.push('--', ...extraArgs);
  const result = spawnSync('npm.cmd', args, {
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

function verifyBuildMode(filePath, devMode) {
  if (!existsSync(filePath)) throw new Error(`Build mode marker is missing: ${filePath}`);
  const source = readFileSync(filePath, 'utf8');
  if (!source.includes(`"devMode":${devMode}`)) {
    throw new Error(`Expected devMode=${devMode} in ${filePath}`);
  }
}

function copyFreshArtifact(source, destination) {
  if (!existsSync(source)) throw new Error(`Build output is missing: ${source}`);
  if (existsSync(destination)) throw new Error(`Refusing to overwrite existing artifact: ${destination}`);
  copyFileSync(source, destination);
}

function moveFreshArtifact(source, destination) {
  if (!existsSync(source)) throw new Error(`Build output is missing: ${source}`);
  if (existsSync(destination)) throw new Error(`Refusing to overwrite existing artifact: ${destination}`);
  renameSync(source, destination);
}

function sha256(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

const androidApk = join(root, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const androidBuildInfo = join(root, 'android', 'app', 'src', 'main', 'assets', 'public', 'js', 'build-info.js');
const artifacts = [];

for (const { devMode, channel } of [
  { devMode: false, channel: 'production' },
  { devMode: true, channel: 'dev' }
]) {
  const androidDirectory = join(releaseDirectory, 'android', channel);
  const windowsDirectory = join(releaseDirectory, 'windows', channel);
  const windowsBuildDirectory = join(buildDirectory, 'windows', channel);
  const modeSuffix = devMode ? 'DEV' : 'PROD';
  const androidDestination = join(
    androidDirectory,
    `FloristEver-${version}-Android-${modeSuffix}.apk`
  );
  const windowsDestination = join(
    windowsDirectory,
    `FloristEver-${version}-${modeSuffix}-Setup.exe`
  );
  mkdirSync(androidDirectory, { recursive: true });
  mkdirSync(windowsDirectory, { recursive: true });

  if (existsSync(androidDestination)) {
    throw new Error(`Refusing to overwrite existing artifact: ${androidDestination}`);
  }
  if (existsSync(windowsDestination)) {
    throw new Error(`Refusing to overwrite existing artifact: ${windowsDestination}`);
  }
  mkdirSync(windowsBuildDirectory, { recursive: true });

  runNpmScript('android:apk:debug', devMode);
  verifyBuildMode(join(root, 'dist', 'js', 'build-info.js'), devMode);
  verifyBuildMode(androidBuildInfo, devMode);
  copyFreshArtifact(androidApk, androidDestination);
  artifacts.push(androidDestination);

  runNpmScript('win:installer', devMode, [
    `--config.directories.output=${windowsBuildDirectory}`
  ]);
  verifyBuildMode(join(root, 'dist', 'js', 'build-info.js'), devMode);
  moveFreshArtifact(
    join(windowsBuildDirectory, `FloristEver-${version}-x64.exe`),
    windowsDestination
  );
  artifacts.push(windowsDestination);
}

runNpmScript('android:sync', false);
verifyBuildMode(join(root, 'dist', 'js', 'build-info.js'), false);
rmSync(buildDirectory, { recursive: true });

const checksums = artifacts.map((filePath) => {
  const relativePath = relative(releaseDirectory, filePath).split(sep).join('/');
  return `${sha256(filePath)}  ${relativePath}`;
});
writeFileSync(checksumPath, `${checksums.join('\n')}\n`, 'utf8');
writeFileSync(
  readmePath,
  [
    `FloristEver ${version} release builds`,
    '',
    'android/production: APK com modo de desenvolvimento desativado.',
    'android/dev: APK com modo de desenvolvimento ativo.',
    'windows/production: instalador NSIS com modo de desenvolvimento desativado.',
    'windows/dev: instalador NSIS com modo de desenvolvimento ativo.',
    '',
    'Os instaladores Windows são ficheiros Setup.exe. Os APKs usam a variante Android debug.',
    'Verifica os SHA-256 em SHA256SUMS.txt antes de distribuir os ficheiros.',
    ''
  ].join('\n'),
  'utf8'
);

console.log(`Release artifacts created for ${version}:`);
for (const filePath of artifacts) {
  console.log(`${filePath} (${sha256(filePath)})`);
}
console.log(`Checksums: ${checksumPath}`);
