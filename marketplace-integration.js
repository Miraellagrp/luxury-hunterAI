const axios = require('axios');
const cheerio = require('cheerio');

class MarketplaceIntegration {
  constructor() {
    this.marketplaces = {
      'TheRealReal': {
        baseUrl: 'https://www.therealreal.com',
        searchPath: '/search',
        selectors: {
          price: '.price',
          title: '.product-title',
          condition: '.condition',
          link: '.product-link'
        }
      },
      'Vestiaire Collective': {
        baseUrl: 'https://www.vestiairecollective.com',
        searchPath: '/search',
        selectors: {
          price: '[data-testid="price"]',
          title: '[data-testid="productTitle"]',
          condition: '.condition-badge',
          link: 'a[data-testid="product-link"]'
        }
      },
      'Fashionphile': {
        baseUrl: 'https://www.fashionphile.com',
        searchPath: '/search',
        selectors: {
          price: '.price-current',
          title: '.product-name',
          condition: '.condition-grade',
          link: '.product-link'
        }
      },
      'Rebag': {
        baseUrl: 'https://shop.rebag.com',
        searchPath: '/search',
        selectors: {
          price: '.price',
          title: '.product-title',
          condition: '.condition',
          link: '.product-item-link'
        }
      },
      'eBay': {
        baseUrl: 'https://www.ebay.com',
        searchPath: '/sch',
        selectors: {
          price: '.s-item__price',
          title: '.s-item__title',
          condition: '.u-flL.condText',
          link: '.s-item__link'
        }
      }
    };

    this.requestConfig = {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    };
  }

  // Main method to get market prices for a brand/model
  async getMarketPrices(brand, model = '') {
    try {
      console.log(`💰 Fetching market prices for ${brand} ${model}...`);

      const searchQuery = this.buildSearchQuery(brand, model);
      const marketplaceResults = await this.searchAllMarketplaces(searchQuery);

      const aggregatedData = this.aggregateMarketData(marketplaceResults);

      return {
        brand,
        model,
        searchQuery,
        prices: aggregatedData.prices,
        priceRange: aggregatedData.priceRange,
        averagePrice: aggregatedData.averagePrice,
        marketplaces: aggregatedData.marketplaces,
        recommendations: this.generateRecommendations(aggregatedData),
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('Market price fetching error:', error);
      return this.getEmptyMarketData(brand, model);
    }
  }

  // Search all marketplaces for the given query
  async searchAllMarketplaces(searchQuery) {
    const results = {};

    for (const [marketplace, config] of Object.entries(this.marketplaces)) {
      try {
        console.log(`🔍 Searching ${marketplace}...`);
        const marketplaceData = await this.searchMarketplace(marketplace, searchQuery, config);
        results[marketplace] = marketplaceData;

        // Add delay between requests to be respectful
        await this.delay(1000);
      } catch (error) {
        console.error(`Error searching ${marketplace}:`, error.message);
        results[marketplace] = { error: error.message, results: [] };
      }
    }

    return results;
  }

  // Search a specific marketplace
  async searchMarketplace(marketplace, searchQuery, config) {
    try {
      const searchUrl = this.buildSearchUrl(config, searchQuery);
      console.log(`📡 Fetching: ${searchUrl}`);

      const response = await axios.get(searchUrl, this.requestConfig);
      const $ = cheerio.load(response.data);

      const items = [];
      const maxItems = 20; // Limit results per marketplace

      // Extract product information
      $(config.selectors.title).slice(0, maxItems).each((index, element) => {
        try {
          const item = this.extractItemData($, element, config.selectors, marketplace);
          if (item.price && item.title) {
            items.push(item);
          }
        } catch (error) {
          console.error(`Error extracting item ${index} from ${marketplace}:`, error.message);
        }
      });

      return {
        marketplace,
        totalResults: items.length,
        results: items,
        searchUrl
      };

    } catch (error) {
      console.error(`Marketplace search error for ${marketplace}:`, error.message);
      return {
        marketplace,
        error: error.message,
        results: []
      };
    }
  }

  // Extract item data from HTML elements
  extractItemData($, titleElement, selectors, marketplace) {
    const $item = $(titleElement).closest('.s-item, .product-item, [data-testid="product"], .product');

    const title = $(titleElement).text().trim();
    const priceText = $item.find(selectors.price).first().text().trim();
    const conditionText = $item.find(selectors.condition).first().text().trim();
    const linkElement = $item.find(selectors.link).first();

    let link = linkElement.attr('href') || '';
    if (link && !link.startsWith('http')) {
      const config = this.marketplaces[marketplace];
      link = config.baseUrl + link;
    }

    const price = this.parsePrice(priceText);

    return {
      title,
      price,
      priceText,
      condition: conditionText || 'Not specified',
      link,
      marketplace,
      extracted: new Date().toISOString()
    };
  }

  // Parse price from text
  parsePrice(priceText) {
    if (!priceText) return null;

    // Remove currency symbols and extract number
    const cleanPrice = priceText.replace(/[^\d,.-]/g, '');
    const numericPrice = parseFloat(cleanPrice.replace(/,/g, ''));

    return isNaN(numericPrice) ? null : numericPrice;
  }

  // Build search URL for marketplace
  buildSearchUrl(config, searchQuery) {
    const baseUrl = config.baseUrl + config.searchPath;
    const encodedQuery = encodeURIComponent(searchQuery);

    // Customize URL building per marketplace
    switch (config.baseUrl) {
      case 'https://www.ebay.com':
        return `${baseUrl}/i.html?_nkw=${encodedQuery}&_sacat=0`;

      case 'https://www.therealreal.com':
        return `${baseUrl}?q=${encodedQuery}`;

      case 'https://www.vestiairecollective.com':
        return `${baseUrl}?q=${encodedQuery}`;

      default:
        return `${baseUrl}?q=${encodedQuery}`;
    }
  }

  // Build search query from brand and model
  buildSearchQuery(brand, model) {
    let query = brand;

    if (model && model !== 'unknown' && model !== 'Unknown Model') {
      query += ` ${model}`;
    }

    // Add luxury/authentic keywords to improve results
    query += ' authentic luxury';

    return query;
  }

  // Aggregate data from all marketplaces
  aggregateMarketData(marketplaceResults) {
    const allPrices = [];
    const allItems = [];
    const marketplaceSummary = {};

    for (const [marketplace, data] of Object.entries(marketplaceResults)) {
      if (data.error) {
        marketplaceSummary[marketplace] = {
          status: 'error',
          error: data.error,
          count: 0
        };
        continue;
      }

      const validItems = data.results.filter(item => item.price && item.price > 0);
      const prices = validItems.map(item => item.price);

      marketplaceSummary[marketplace] = {
        status: 'success',
        count: validItems.length,
        averagePrice: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
        priceRange: prices.length > 0 ? {
          min: Math.min(...prices),
          max: Math.max(...prices)
        } : null
      };

      allPrices.push(...prices);
      allItems.push(...validItems);
    }

    // Calculate overall statistics
    const overallStats = this.calculatePriceStatistics(allPrices);

    return {
      prices: allPrices,
      items: allItems,
      priceRange: overallStats.range,
      averagePrice: overallStats.average,
      medianPrice: overallStats.median,
      marketplaces: marketplaceSummary,
      totalItems: allItems.length
    };
  }

  // Calculate price statistics
  calculatePriceStatistics(prices) {
    if (prices.length === 0) {
      return {
        average: 0,
        median: 0,
        range: { min: 0, max: 0 }
      };
    }

    const sortedPrices = [...prices].sort((a, b) => a - b);
    const sum = prices.reduce((a, b) => a + b, 0);

    return {
      average: sum / prices.length,
      median: sortedPrices[Math.floor(sortedPrices.length / 2)],
      range: {
        min: Math.min(...prices),
        max: Math.max(...prices)
      }
    };
  }

  // Generate recommendations based on market data
  generateRecommendations(aggregatedData) {
    const recommendations = [];

    if (aggregatedData.totalItems === 0) {
      return ['No market data available for price comparison'];
    }

    const avgPrice = aggregatedData.averagePrice;
    const priceRange = aggregatedData.priceRange;

    // Price recommendations
    if (avgPrice > 0) {
      recommendations.push(`Average market price: $${avgPrice.toFixed(2)}`);

      if (priceRange.min < avgPrice * 0.8) {
        recommendations.push(`Good deals available starting from $${priceRange.min.toFixed(2)}`);
      }

      if (priceRange.max > avgPrice * 1.2) {
        recommendations.push(`Premium options available up to $${priceRange.max.toFixed(2)}`);
      }
    }

    // Marketplace recommendations
    const bestMarketplace = this.findBestMarketplace(aggregatedData.marketplaces);
    if (bestMarketplace) {
      recommendations.push(`Most listings found on ${bestMarketplace}`);
    }

    // Condition recommendations
    recommendations.push('Consider condition when comparing prices');
    recommendations.push('Verify authenticity with trusted sellers');

    return recommendations;
  }

  // Find marketplace with best results
  findBestMarketplace(marketplaces) {
    let bestMarketplace = null;
    let maxCount = 0;

    for (const [marketplace, data] of Object.entries(marketplaces)) {
      if (data.status === 'success' && data.count > maxCount) {
        maxCount = data.count;
        bestMarketplace = marketplace;
      }
    }

    return bestMarketplace;
  }

  // Compare prices across all marketplaces
  async compareAllMarketplaces(brand, model, condition = 'used') {
    try {
      const marketData = await this.getMarketPrices(brand, model);

      // Filter by condition if specified
      let filteredItems = marketData.items;
      if (condition !== 'all') {
        filteredItems = marketData.items.filter(item =>
          item.condition.toLowerCase().includes(condition.toLowerCase())
        );
      }

      // Group by marketplace
      const comparison = {};
      for (const item of filteredItems) {
        if (!comparison[item.marketplace]) {
          comparison[item.marketplace] = [];
        }
        comparison[item.marketplace].push(item);
      }

      // Calculate marketplace statistics
      for (const [marketplace, items] of Object.entries(comparison)) {
        const prices = items.map(item => item.price).filter(p => p > 0);
        const stats = this.calculatePriceStatistics(prices);

        comparison[marketplace] = {
          items,
          count: items.length,
          ...stats
        };
      }

      return {
        brand,
        model,
        condition,
        comparison,
        totalItems: filteredItems.length,
        summary: this.generateComparisonSummary(comparison)
      };

    } catch (error) {
      console.error('Price comparison error:', error);
      return {
        brand,
        model,
        condition,
        error: error.message,
        comparison: {}
      };
    }
  }

  // Generate comparison summary
  generateComparisonSummary(comparison) {
    const marketplaces = Object.keys(comparison);
    if (marketplaces.length === 0) return 'No data available for comparison';

    const bestPrices = [];
    const summaryLines = [];

    for (const [marketplace, data] of Object.entries(comparison)) {
      if (data.count > 0) {
        bestPrices.push({ marketplace, price: data.range.min });
        summaryLines.push(`${marketplace}: ${data.count} items, avg $${data.average.toFixed(2)}`);
      }
    }

    // Find best deal
    if (bestPrices.length > 0) {
      const bestDeal = bestPrices.reduce((best, current) =>
        current.price < best.price ? current : best
      );
      summaryLines.unshift(`Best price: $${bestDeal.price} on ${bestDeal.marketplace}`);
    }

    return summaryLines.join(' | ');
  }

  // Get empty market data structure
  getEmptyMarketData(brand, model) {
    return {
      brand,
      model,
      prices: [],
      priceRange: { min: 0, max: 0 },
      averagePrice: 0,
      marketplaces: {},
      recommendations: ['Unable to fetch current market data'],
      lastUpdated: new Date().toISOString(),
      error: 'Market data unavailable'
    };
  }

  // Utility method to add delay between requests
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get marketplace status
  async checkMarketplaceStatus() {
    const status = {};

    for (const [marketplace, config] of Object.entries(this.marketplaces)) {
      try {
        const response = await axios.get(config.baseUrl, {
          ...this.requestConfig,
          timeout: 5000
        });

        status[marketplace] = {
          status: response.status === 200 ? 'online' : 'issues',
          responseTime: response.config.timeout
        };
      } catch (error) {
        status[marketplace] = {
          status: 'offline',
          error: error.message
        };
      }
    }

    return status;
  }
}

module.exports = new MarketplaceIntegration();