const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TARGET_DIR = path.join(ROOT, 'js');

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (entry.isFile() && fullPath.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

function scanFile(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  const findings = [];

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (line.includes('Date.now(')) {
      const prevLine = lines[idx - 1] || '';
      const hasException = line.includes('WALL_CLOCK_OK') || prevLine.includes('WALL_CLOCK_OK');
      if (!hasException) {
        findings.push({ type: 'Date.now', lineNum, line: line.trim() });
      }
    }
    if (line.includes('children[')) {
      findings.push({ type: 'children[]', lineNum, line: line.trim() });
    }
  });

  return findings;
}

function main() {
  const files = walk(TARGET_DIR);
  let total = 0;

  for (const file of files) {
    const findings = scanFile(file);
    if (findings.length) {
      console.log(`\n${path.relative(ROOT, file)}`);
      for (const f of findings) {
        total += 1;
        console.log(`  ${f.type} @ ${f.lineNum}: ${f.line}`);
      }
    }
  }

  if (!total) {
    console.log('No timing or scene-graph warnings found.');
  } else {
    console.log(`\nWarnings: ${total}`);
  }
}

main();
