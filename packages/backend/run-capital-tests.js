#!/usr/bin/env node

// Simple test runner for capital tests
const { execSync } = require('child_process');

try {
  console.log('Running capital calculation property-based tests...\n');
  
  const output = execSync('jest --testPathPattern="capital.test" --run', {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: true,
  });
  
  process.exit(0);
} catch (error) {
  console.error('Test execution failed:', error.message);
  process.exit(1);
}
