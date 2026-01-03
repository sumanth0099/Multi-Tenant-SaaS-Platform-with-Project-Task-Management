require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const pool = new Pool({

    user: process.env.DB_USER,
    host: process.env.DB_HOST ,
    database: process.env.DB_NAME ,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

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
