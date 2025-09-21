const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const luxuryMatcher = require('./luxury-matcher');
const brandDetectors = require('./brand-detectors');
const marketplaceIntegration = require('./marketplace-integration');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/luxury-hunter', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Luxury Hunter API is running' });
});

// Upload and authenticate luxury item
app.post('/api/authenticate', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const imagePath = req.file.path;

    // Detect brand using AI
    const brandDetection = await brandDetectors.detectBrand(imagePath);

    if (!brandDetection.detected) {
      return res.status(400).json({
        error: 'Unable to detect luxury brand',
        confidence: brandDetection.confidence
      });
    }

    // Authenticate the item
    const authentication = await luxuryMatcher.authenticateItem(imagePath, brandDetection.brand);

    // Get market prices
    const marketData = await marketplaceIntegration.getMarketPrices(
      brandDetection.brand,
      authentication.model || 'unknown'
    );

    res.json({
      brand: brandDetection.brand,
      model: authentication.model,
      authentic: authentication.authentic,
      confidence: authentication.confidence,
      features: authentication.features,
      marketPrices: marketData.prices,
      priceRange: marketData.priceRange,
      recommendations: marketData.recommendations
    });

  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
});

// Get market data for specific brand/model
app.get('/api/market/:brand/:model?', async (req, res) => {
  try {
    const { brand, model } = req.params;
    const marketData = await marketplaceIntegration.getMarketPrices(brand, model);

    res.json(marketData);
  } catch (error) {
    console.error('Market data error:', error);
    res.status(500).json({ error: 'Unable to fetch market data' });
  }
});

// Get supported brands
app.get('/api/brands', (req, res) => {
  const supportedBrands = brandDetectors.getSupportedBrands();
  res.json({ brands: supportedBrands });
});

// Price comparison endpoint
app.post('/api/compare-prices', async (req, res) => {
  try {
    const { brand, model, condition = 'used' } = req.body;

    if (!brand) {
      return res.status(400).json({ error: 'Brand is required' });
    }

    const comparison = await marketplaceIntegration.compareAllMarketplaces(brand, model, condition);

    res.json(comparison);
  } catch (error) {
    console.error('Price comparison error:', error);
    res.status(500).json({ error: 'Unable to compare prices' });
  }
});

// Authentication history endpoint
app.get('/api/history', async (req, res) => {
  try {
    // This would typically fetch from database
    // For now, return placeholder data
    res.json({
      total: 0,
      authentications: [],
      message: 'Authentication history feature coming soon'
    });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Unable to fetch history' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🏺 Luxury Hunter API running on port ${PORT}`);
  console.log(`📸 Ready to authenticate luxury items`);
  console.log(`💰 Market price matching enabled`);
});

module.exports = app;