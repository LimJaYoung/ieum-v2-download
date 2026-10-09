import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyRecordLayout, applyRecordMotion } from './record-motion.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(root, 'ieum-v2-download');
const output = path.resolve(root, 'dist');
const base = process.argv[2] ?? '/ieum-v2-download/';
if (!/^\/(?:[A-Za-z0-9._-]+\/)*$/.test(base)) {
  throw new Error('Base path must begin and end with / and contain only URL-safe segments.');
}
const siteUrl = process.argv[3] ?? `https://limjayoung.github.io${base}`;
const manifest = JSON.parse(await readFile(path.join(source, 'download-manifest.json'), 'utf8'));
const assetReference = /(["'`(])\/(assets\/|audio\/|figma\/|demo-stems\/|manifest\.webmanifest\b)/g;
const textExtensions = new Set(['.html', '.js', '.css', '.json', '.webmanifest', '.svg']);

// Read only the original public files listed in the archive, validating every byte.
const files = await Promise.all(manifest.files.map(async (entry) => {
  const sourcePath = path.resolve(source, entry.path);
  if (!sourcePath.startsWith(source + path.sep)) throw new Error(`Unsafe source path: ${entry.path}`);
  const bytes = await readFile(sourcePath);
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (hash !== entry.sha256 || bytes.length !== entry.bytes) {
    throw new Error(`Original archive checksum mismatch: ${entry.path}`);
  }
  let content = bytes;
  if (textExtensions.has(path.extname(entry.path))) {
    content = bytes.toString('utf8').replace(assetReference, (_, quote, resource) => `${quote}${base}${resource}`);
    if (entry.path.endsWith('.js')) {
      content = content.replaceAll('https://ieum-v2-react.vercel.app', siteUrl.replace(/\/$/, ''));
      content = applyRecordMotion(content);
    }
    if (entry.path.endsWith('.css')) {
      content = applyRecordLayout(content);
      // Update the shared small-label rule in place.
      content = content.replace('.kicker,.topbar-center,.top-meta,.section-head>span{font-size:12px}', '.kicker,.topbar-center,.top-meta,.section-head>span{font-size:10px}');
      // Edit the existing all-width heading rule without adding another override.
      content = content.replace('.home-intro h1{font-size:42px}', '.home-intro h1{font-size:34px;margin-bottom:8px}');
      // Add 15px to the description's existing 14px bottom margin.
      content = content.replace('.home-intro p:not(.kicker){max-width:360px}', '.home-intro p:not(.kicker){max-width:360px;margin-bottom:29px}');
      // Use one scrollbar policy for the page, app panels, and dialogs.
      // Only hide the browser's scrollbars; keep overflow and input behavior intact.
      content = content
        .replace(/(?:scrollbar-width|scrollbar-color|-ms-overflow-style):[^;}]+;?/g, '')
        .replace(/[^{}]+::-webkit-scrollbar(?:-[a-z-]+)?\{[^{}]*\}/g, '')
        .replace(/[^{}]+\{\}/g, '');
      content = '*{scrollbar-width:none;-ms-overflow-style:none}*::-webkit-scrollbar{display:none;width:0;height:0}' + content;
    }
    if (entry.path === 'manifest.webmanifest') {
      const webmanifest = JSON.parse(content);
      webmanifest.start_url = `${base}#home`;
      webmanifest.scope = base;
      content = JSON.stringify(webmanifest, null, 2) + '\n';
    }
  }
  return { name: entry.path, content };
}));

// Give changed styles and animation code fresh URLs for existing visitors.
for (const file of files.filter((file) => /\.(css|js)$/.test(file.name))) {
  const oldName = file.name;
  const digest = createHash('sha256').update(file.content).digest('hex').slice(0, 12);
  file.name = `assets/index-${digest}${path.extname(oldName)}`;
  for (const reference of files.filter((file) => typeof file.content === 'string')) {
    reference.content = reference.content.replaceAll(`${base}${oldName}`, `${base}${file.name}`);
  }
}

// The only directory this build may replace is this repository's generated dist.
if (output !== path.join(root, 'dist') || path.dirname(output) !== path.resolve(root)) {
  throw new Error('Output must be the dist directory inside this repository.');
}
await rm(output, { recursive: true, force: true });
for (const file of files) {
  const destination = path.resolve(output, file.name);
  if (!destination.startsWith(output + path.sep)) throw new Error(`Unsafe output path: ${file.name}`);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, file.content);
}
await writeFile(path.join(output, '.nojekyll'), '');

// Catch broken image, font, audio, and manifest references before publishing.
const escapedBase = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const deployedReference = new RegExp(`["'\x60(]${escapedBase}((?:assets/|audio/|figma/|demo-stems/|manifest\\.webmanifest)[^"'\x60()\\s<>]*)`, 'g');
let references = 0;
for (const file of files.filter((file) => typeof file.content === 'string')) {
  for (const match of file.content.matchAll(deployedReference)) {
    const resource = match[1].split(/[?#]/)[0];
    const target = path.resolve(output, resource);
    if (!target.startsWith(output + path.sep) || !(await stat(target)).isFile()) {
      throw new Error(`Missing resource in ${file.name}: ${resource}`);
    }
    references += 1;
  }
}
console.log(`Verified ${files.length} original files; built ${output}`);
console.log(`Base path: ${base}; checked ${references} asset references.`);
