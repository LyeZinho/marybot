#!/usr/bin/env node

// Startup script for API service
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Starting MaryBot API Service...');
console.log(`📁 Working directory: ${process.cwd()}`);
console.log(`📄 Script location: ${__filename}`);

// Import and start the main application
try {
  await import('./src/index.js');
} catch (error) {
  console.error('❌ Failed to start API service:', error);
  process.exit(1);
}