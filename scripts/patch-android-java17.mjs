#!/usr/bin/env node
// Patches capacitor-generated build files to use Java 17 instead of 21
// Required because the local JDK is 17, but Capacitor 7 defaults to Java 21

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const version = packageJson.version;
const versionParts = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
if (!versionParts) {
  throw new Error(`Unsupported Android app version: ${version}`);
}

const androidVersionCode = Number(versionParts[1]) * 1000000
  + Number(versionParts[2]) * 1000
  + Number(versionParts[3]);
const androidGradleFile = join(root, 'android', 'app', 'build.gradle');
const androidGradle = readFileSync(androidGradleFile, 'utf8');
if (!/versionCode\s+\d+/.test(androidGradle) || !/versionName\s+["'][^"']+["']/.test(androidGradle)) {
  throw new Error(`Android version settings were not found in ${androidGradleFile}`);
}
const updatedAndroidGradle = androidGradle
  .replace(/versionCode\s+\d+/, `versionCode ${androidVersionCode}`)
  .replace(/versionName\s+["'][^"']+["']/, `versionName "${version}"`);
if (androidGradle !== updatedAndroidGradle) {
  writeFileSync(androidGradleFile, updatedAndroidGradle, 'utf8');
  console.log(`Android version configured: ${version} (${androidVersionCode})`);
}

const filesToPatch = [
  join(root, 'android', 'app', 'capacitor.build.gradle'),
  join(root, 'node_modules', '@capacitor', 'android', 'capacitor', 'build.gradle'),
];

let patched = 0;
for (const file of filesToPatch) {
  try {
    const original = readFileSync(file, 'utf8');
    const updated = original.replace(/JavaVersion\.VERSION_21/g, 'JavaVersion.VERSION_17');
    if (original !== updated) {
      writeFileSync(file, updated, 'utf8');
      console.log(`✓ Patched: ${file}`);
      patched++;
    } else {
      console.log(`  Already OK: ${file}`);
    }
  } catch (e) {
    console.warn(`  Skipped (not found): ${file}`);
  }
}
console.log(`\nPatch complete. ${patched} file(s) updated.`);
