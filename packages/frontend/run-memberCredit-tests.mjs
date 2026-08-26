#!/usr/bin/env node

/**
 * Simple test verification script for member credit tests
 * Runs vitest for memberCredit.test.ts
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const vitest = spawn('vitest', ['run', 'src/__tests__/lib/memberCredit.test.ts'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true,
});

vitest.on('close', (code) => {
  process.exit(code);
});
