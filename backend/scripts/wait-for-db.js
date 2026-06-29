require('dotenv').config();
const pool = require('../src/config/db');

async function waitForDb() {
  const maxAttempts = 30;
  const delayMs = 2000;
  
  console.log('⏳ Checking database connection readiness...');
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log('✅ Database is ready and reachable!');
      process.exit(0);
    } catch (error) {
      console.log(`⚠️ Connection attempt ${attempt}/${maxAttempts} failed: ${error.message}`);
      if (attempt === maxAttempts) {
        console.error('💥 Database connection could not be established. Exiting...');
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

waitForDb().catch(err => {
  console.error('💥 Unexpected error in wait-for-db script:', err);
  process.exit(1);
});
