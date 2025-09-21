const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB connection - optional for now
const mongoose = require('mongoose');
if (process.env.MONGODB_URI && process.env.MONGODB_URI !== 'skip') {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => {
      console.error('MongoDB connection failed, running without database:', err.message);
    });
}

// Basic routes that work without MongoDB
app.get('/', (req, res) => {
  res.json({
    status: 'Luxury Hunter AI is running',
    message: 'Authentication service active',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'not connected'
  });
});

app.get('/api/brands', (req, res) => {
  res.json({
    brands: ['Louis Vuitton', 'Chanel', 'Hermes', 'Gucci'],
    status: 'active'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'luxury-hunter' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Luxury Hunter running on port ${PORT}`);
});