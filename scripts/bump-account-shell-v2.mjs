import { readFile, writeFile } from 'node:fs/promises';

const files = [
  'index.html',
  'tests/membership-contract.test.js',
  'tests/pwa.test.js',
];

for (const file of files) {
  const source = await readFile(file, 'utf8');
  const next = source
    .replaceAll('account-shell.css?v=1', 'account-shell.css?v=2')
    .replaceAll('account-shell.js?v=1', 'account-shell.js?v=2');
  if (next === source) throw new Error(`${file} did not contain Account Shell v1.`);
  await writeFile(file, next, 'utf8');
}

// One-shot branch update. Remove before merge.
