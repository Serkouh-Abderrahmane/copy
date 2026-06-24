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

let replaced = 0;
let totalChanges = 0;

for (const filePath of files) {
  let content = fs.readFileSync(filePath, 'utf8');
  const before = content;
  content = content.replace(/(?<!https?:)\/\/luonvuituoi\.co/g, '');
  if (content !== before) {
    fs.writeFileSync(filePath, content, 'utf8');
    replaced++;
    const count = (before.match(/\/\/luonvuituoi\.co/g) || []).length;
    totalChanges += count;
    console.log(`[${replaced}] ${path.relative(rootDir, filePath)} (${count} replacements)`);
  }
}

console.log(`\nDone! Fixed ${replaced}/${files.length} files with ${totalChanges} total replacements.`);
