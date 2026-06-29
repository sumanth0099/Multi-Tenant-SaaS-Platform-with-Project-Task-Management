require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const pool = require('./src/config/db');

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());

// Routes
app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT 1");
    res.json({
      status: "ok",
      database: "connected"
    });
  } catch (error) {
    console.error("Healthcheck DB error:", error);
    res.status(500).json({
      status: "error",
      database: "disconnected",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});


const routes = require('./src/routes/auth.routes.js'); // adjust path if needed
app.use('/api', routes); // or app.use('/', routes);

// Test DB connection
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring client', err.stack);
  }
  client.query('SELECT NOW()', (err, result) => {
    release();
    if (err) {
      return console.error('Error executing query', err.stack);
    }
    console.log('Database connected successfully:', result.rows[0]);
  });
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Catch-all route to serve React's index.html for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});