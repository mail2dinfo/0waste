#!/usr/bin/env node

/**
 * Setup script to copy .env.local.template files to .env.local
 * This helps users set up their local development environment quickly
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const [target] = process.argv.slice(2);

if (!target || (target !== 'client' && target !== 'server')) {
  console.error('Usage: node copy-env-templates.js [client|server]');
  console.error('  or: node copy-env-templates.js all (to setup both)');
  process.exit(1);
}

function setupEnvFor(target) {
  const targetDir = join(projectRoot, target);
  const templatePath = join(targetDir, '.env.local.template');
  const envPath = join(targetDir, '.env.local');

  if (existsSync(envPath)) {
    console.log(`⚠️  ${target}/.env.local already exists. Skipping...`);
    return false;
  }

  if (!existsSync(templatePath)) {
    console.log(`⚠️  ${target}/.env.local.template not found. Creating from scratch...`);
    
    if (target === 'client') {
      writeFileSync(envPath, `# Local Development Configuration
VITE_API_URL=http://localhost:4000/api
VITE_FRONTEND_URL=http://localhost:5173
`, 'utf8');
    } else if (target === 'server') {
      writeFileSync(envPath, `# Local Development Configuration
PORT=4000
NODE_ENV=development

# Frontend Configuration
FRONTEND_URL=http://localhost:5173
INVITE_BASE_URL=http://localhost:5173/invite

# Database Configuration (Local PostgreSQL)
# ⚠️  UPDATE THESE VALUES WITH YOUR LOCAL DATABASE CREDENTIALS
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=zerovaste
DB_USER=postgres
DB_PASSWORD=your_local_password_here
DB_SSL=false
DB_LOGGING=true
`, 'utf8');
    }
  } else {
    copyFileSync(templatePath, envPath);
    console.log(`✅ Created ${target}/.env.local from template`);
  }

  if (target === 'server') {
    console.log(`⚠️  IMPORTANT: Update ${target}/.env.local with your local database credentials!`);
  }

  return true;
}

if (target === 'all') {
  setupEnvFor('client');
  setupEnvFor('server');
  console.log('\n✨ Setup complete!');
  console.log('\nNext steps:');
  console.log('1. Update server/.env.local with your local database credentials');
  console.log('2. Start backend: cd server && npm run dev');
  console.log('3. Start frontend: cd client && npm run dev');
} else {
  const created = setupEnvFor(target);
  if (created) {
    console.log(`\n✨ ${target}/.env.local created successfully!`);
    if (target === 'server') {
      console.log('⚠️  Don\'t forget to update the database credentials!');
    }
  }
}



