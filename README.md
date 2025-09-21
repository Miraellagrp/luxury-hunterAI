# Luxury Hunter - AI Authentication & Price Matching

## Overview
Luxury Hunter is an AI-powered application that authenticates luxury items and provides real-time market price comparisons across multiple marketplaces.

## Features

### 🔍 AI Authentication
- Brand detection using computer vision
- Authenticity verification with machine learning
- Feature analysis (stitching, materials, hardware)
- Confidence scoring and detailed reports

### 💰 Price Matching
- Real-time price comparison across major marketplaces
- Market trend analysis
- Deal recommendations
- Historical price tracking

### 🏺 Supported Brands
- Louis Vuitton
- Gucci
- Chanel
- Hermès
- Prada
- Dior
- Fendi
- Bottega Veneta
- Saint Laurent
- Balenciaga
- Celine
- Loewe

### 🛍️ Marketplace Integration
- TheRealReal
- Vestiaire Collective
- Fashionphile
- Rebag
- eBay

## Installation

```bash
# Clone the repository
git clone https://github.com/Miraellagrp/luxury-hunterAI.git
cd luxury-hunter

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Start the application
npm start
```

## API Endpoints

### Authentication
- `POST /api/authenticate` - Upload image for authentication
- `GET /api/brands` - Get supported brands

### Market Data
- `GET /api/market/:brand/:model?` - Get market prices
- `POST /api/compare-prices` - Compare prices across marketplaces

### Utilities
- `GET /health` - Health check
- `GET /api/history` - Authentication history

## Usage

### Authenticate an Item
```javascript
const formData = new FormData();
formData.append('image', imageFile);

const response = await fetch('/api/authenticate', {
  method: 'POST',
  body: formData
});

const result = await response.json();
```

### Get Market Prices
```javascript
const response = await fetch('/api/market/Louis Vuitton/Speedy');
const marketData = await response.json();
```

## Environment Variables

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/luxury-hunter
NODE_ENV=development
```

## Technology Stack

- **Backend**: Node.js, Express.js
- **AI/ML**: TensorFlow.js
- **Database**: MongoDB
- **Image Processing**: Sharp, Canvas
- **Web Scraping**: Axios, Cheerio

## Development

```bash
# Development mode with auto-reload
npm run dev

# Production build
npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

ISC License

## Support

For support and questions, please open an issue on GitHub.