require('dotenv').config();
const pool = require('../src/config/db');
const bcrypt = require('bcryptjs');

const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

async function seed() {
  // Load your seeds folder SQL files
  const seedsDir = path.join(__dirname, '../seeds');
  if (fs.existsSync(seedsDir)) {
    const seedFiles = fs.readdirSync(seedsDir).sort();
    for (const file of seedFiles) {
      if (file.endsWith('.sql')) {
        const sql = fs.readFileSync(path.join(seedsDir, file), 'utf8');
        await pool.query(sql);
        console.log(`🌱 Seeded: ${file}`);
      }
    }
  }

  // Fallback: create minimum required data if seeds/ empty
  console.log('✅ Seeding complete (check submission.json for credentials)');
  await pool.end();
}

seed().catch(console.error);
