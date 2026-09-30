require('dotenv').config();
const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/health.routes');
const { testConnection } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/health', healthRoutes);

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  try {
    await testConnection();
  } catch (err) {
    console.error('PostgreSQL connection failed:', err.message);
  }
});