const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const ignoreDirs = new Set(['node_modules', 'backend', 'views', 'scripts', '.git']);

function findHtmlFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    if (ignoreDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(findHtmlFiles(full));
    } else if (entry.name.endsWith('.html')) {
      files.push(full);
    }
  }
  return files;
}

const files = findHtmlFiles(rootDir);
console.log(`Found ${files.length} HTML files to process.`);

let totalChanges = 0;

for (const filePath of files) {
  let content = fs.readFileSync(filePath, 'utf8');
  const before = content;
  // Replace http://luonvuituoi.co/cdn and https://luonvuituoi.co/cdn -> /cdn
  content = content.replace(/https?:\/\/luonvuituoi\.co\/cdn/g, '/cdn');
  // Replace JSON-escaped https:\/\/luonvuituoi.co\/cdn (in JSON) -> \/cdn
  content = content.replace(/https:\\\/\\\/luonvuituoi\.co\/cdn/g, '\/cdn');
  // Replace JSON-escaped \/\/luonvuituoi.co (in script tags)
  content = content.replace(/\\\/\\\/luonvuituoi\.co/g, '');
  // Replace //luonvuituoi.co (protocol-relative, not preceded by https:)
  content = content.replace(/(?<!https?:)\/\/luonvuituoi\.co/g, '');
  if (content !== before) {
    fs.writeFileSync(filePath, content, 'utf8');
    const count = (before.match(/https?:\/\/luonvuituoi\.co\/cdn|https:\\\/\\\/luonvuituoi\.co\/cdn|\\\/\\\/luonvuituoi\.co|(?<!https?:)\/\/luonvuituoi\.co/g) || []).length;
    totalChanges += count;
    console.log(`Fixed ${path.relative(rootDir, filePath)} (${count} replacements)`);
  }
}

console.log(`\nDone! Total: ${totalChanges} replacements in ${files.length} files.`);
