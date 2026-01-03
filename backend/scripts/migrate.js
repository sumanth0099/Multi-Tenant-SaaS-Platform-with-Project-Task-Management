require('dotenv').config();
const pool = require('../src/config/db');  // ✅ Use existing pool instance
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  console.log('🚀 Starting migrations...');
  
  try {
    const migrationsDir = path.join(__dirname, '../migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    console.log(`📁 Found ${files.length} migration files:`, files);
    
    if (files.length === 0) {
      console.error('❌ No .sql files in backend/migrations/');
      process.exit(1);
    }
    
    for (const file of files) {
      console.log(`📄 Running ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await pool.query(sql);
      console.log(`✅ ${file} complete`);
    }
    
    console.log('🎉 All migrations complete!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
  // ✅ No pool.end() - server needs connection
}

runMigrations();
