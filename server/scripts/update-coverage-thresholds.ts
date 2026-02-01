import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';

// Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVER_ROOT = path.join(__dirname, '..');
const COVERAGE_FILE = path.join(SERVER_ROOT, 'coverage', 'coverage-final.json');
const VITEST_CONFIG = path.join(SERVER_ROOT, 'vitest.config.ts');

// Read coverage file
if (!fs.existsSync(COVERAGE_FILE)) {
  console.error('Coverage file not found. Run "npm run test:coverage" first.');
  process.exit(1);
}

interface CoverageSummary {
  [key: string]: {
    s: Record<string, number>;
    b: Record<string, number[]>;
    f: Record<string, number>;
  };
}

const coverageData = JSON.parse(fs.readFileSync(COVERAGE_FILE, 'utf8')) as CoverageSummary;

// Calculate current coverage metrics
let totalStatements = 0,
  coveredStatements = 0;
let totalBranches = 0,
  coveredBranches = 0;
let totalFunctions = 0,
  coveredFunctions = 0;
let totalLines = 0,
  coveredLines = 0;

Object.values(coverageData).forEach(file => {
  // Statements
  Object.values(file.s).forEach((count: number) => {
    totalStatements++;
    if (count > 0) coveredStatements++;
  });

  // Branches
  Object.values(file.b).forEach((counts: number[]) => {
    counts.forEach((count: number) => {
      totalBranches++;
      if (count > 0) coveredBranches++;
    });
  });

  // Functions
  Object.values(file.f).forEach((count: number) => {
    totalFunctions++;
    if (count > 0) coveredFunctions++;
  });

  // Lines calculation usually mirrors statements or has own map,
  // but for V8 provider in simple summary, we can approximate lines ~ statements
  // or parse specific line map if needed.
  // However, istanbul/v8 coverage format usually provides 's', 'b', 'f'.
  // Let's use statements as proxy for lines if explicit line map isn't easily summed
  // without more complex parsing, OR simply use the same counts if we trust v8 provider.
  // Actually, let's just use statements count for lines as they are often 1:1 in these summaries
  // unless we want to do strict line counting.
  // For safety and strictness, let's rely on what we put in config: lines == statements.
  totalLines = totalStatements;
  coveredLines = coveredStatements;
});

const current = {
  statements: (coveredStatements / totalStatements) * 100,
  branches: (coveredBranches / totalBranches) * 100,
  functions: (coveredFunctions / totalFunctions) * 100,
  lines: (coveredLines / totalLines) * 100,
};

console.log('Current Coverage:', JSON.stringify(current, null, 2));

// Read config file
let configContent = fs.readFileSync(VITEST_CONFIG, 'utf8');

// Regex to find thresholds
// Expecting format like:
// thresholds: {
//   statements: 80.83,
//   branches: 69.73,
//   functions: 82.42,
//   lines: 80.83,
// },

let updated = false;

function updateThreshold(key: string, currentValue: number) {
  const regex = new RegExp(`${key}:\\s*([0-9.]+)`, 'g');
  const match = regex.exec(configContent);

  if (match && match[1]) {
    const configuredValue = parseFloat(match[1]);
    // Allow a small margin for floating point differences or if we want to be exceedingly strict
    // We only update if WE ARE BETTER significantly (e.g. > 0.01%)
    if (currentValue > configuredValue) {
      console.log(
        `Ratcheting up ${key}: ${configuredValue.toFixed(2)}% -> ${currentValue.toFixed(2)}%`
      );
      // Replace with fixed 2 decimal points
      configContent = configContent.replace(regex, `${key}: ${currentValue.toFixed(2)}`);
      updated = true;
    }
  }
}

updateThreshold('statements', current.statements);
updateThreshold('branches', current.branches);
updateThreshold('functions', current.functions);
updateThreshold('lines', current.lines);

if (updated) {
  fs.writeFileSync(VITEST_CONFIG, configContent, 'utf8');
  console.log('Updated vitest.config.ts with new thresholds.');
} else {
  console.log('No coverage improvements detected. Thresholds remain unchanged.');
}
