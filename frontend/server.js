const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 3000;

app.use(express.json());

// Catalog replicas
const CATALOG_REPLICAS = [
  process.env.CATALOG_URL || 'http://localhost:3001',
  process.env.CATALOG_URL_2 || 'http://localhost:3003'
];

// Order replicas
const ORDER_REPLICAS = [
  process.env.ORDER_URL || 'http://localhost:3002',
  process.env.ORDER_URL_2 || 'http://localhost:3004'
];

// Round-robin indexes
let catalogIndex = 0;
let orderIndex = 0;

// In-memory cache for item info requests
// key: item id
// value: item details returned from catalog
const itemCache = new Map();

// Get next catalog replica using round-robin
function getNextCatalogReplica() {
  const replica = CATALOG_REPLICAS[catalogIndex];

  catalogIndex = (catalogIndex + 1) % CATALOG_REPLICAS.length;

  console.log(`[Frontend] Forwarding catalog request to: ${replica}`);

  return replica;
}

// Get next order replica using round-robin
function getNextOrderReplica() {
  const replica = ORDER_REPLICAS[orderIndex];

  orderIndex = (orderIndex + 1) % ORDER_REPLICAS.length;

  console.log(`[Frontend] Forwarding order request to: ${replica}`);

  return replica;
}

// View current cache content
app.get('/cache', (req, res) => {
  const cacheContent = Object.fromEntries(itemCache);

  res.json({
    message: 'Current frontend cache content',
    cacheSize: itemCache.size,
    cache: cacheContent
  });
});

// Invalidate one cached item
app.post('/invalidate/:id', (req, res) => {
  const id = req.params.id;

  if (itemCache.has(id)) {
    itemCache.delete(id);

    console.log(`[Frontend] Cache invalidated for item: ${id}`);

    return res.json({
      message: `Cache invalidated for item ${id}`,
      itemId: id
    });
  }

  console.log(`[Frontend] No cache entry found for item: ${id}`);

  res.json({
    message: `No cache entry found for item ${id}`,
    itemId: id
  });
});

// Clear all cache
app.post('/invalidate', (req, res) => {
  itemCache.clear();

  console.log('[Frontend] Entire cache cleared');

  res.json({
    message: 'Entire cache cleared'
  });
});

app.get('/search/:topic', async (req, res) => {
  const topic = req.params.topic;

  console.log(`[Frontend] Search request received for topic: ${topic}`);

  try {
    const catalogUrl = getNextCatalogReplica();

    const response = await axios.get(
      `${catalogUrl}/query/topic/${encodeURIComponent(topic)}`
    );

    res.json({
      message: 'Search completed successfully',
      servedBy: catalogUrl,
      source: 'catalog',
      items: response.data.items
    });
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }

    console.error(`[Frontend] Search failed: ${error.message}`);
    res.status(500).json({
      message: 'Search request failed'
    });
  }
});

app.get('/info/:id', async (req, res) => {
  const id = req.params.id;

  console.log(`[Frontend] Info request received for item: ${id}`);

  // Cache hit
  if (itemCache.has(id)) {
    console.log(`[Frontend] CACHE HIT for item: ${id}`);

    return res.json({
      message: 'Item details retrieved successfully from cache',
      source: 'cache',
      cacheStatus: 'HIT',
      item: itemCache.get(id)
    });
  }

  // Cache miss
  console.log(`[Frontend] CACHE MISS for item: ${id}`);

  try {
    const catalogUrl = getNextCatalogReplica();

    const response = await axios.get(`${catalogUrl}/query/item/${id}`);

    const item = response.data.item;

    // Save result in cache
    itemCache.set(id, item);

    console.log(`[Frontend] Item ${id} stored in cache`);

    res.json({
      message: 'Item details retrieved successfully from catalog',
      servedBy: catalogUrl,
      source: 'catalog',
      cacheStatus: 'MISS',
      item: item
    });
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }

    console.error(`[Frontend] Info request failed: ${error.message}`);
    res.status(500).json({
      message: 'Info request failed'
    });
  }
});

app.post('/purchase/:id', async (req, res) => {
  const id = req.params.id;

  console.log(`[Frontend] Purchase request received for item: ${id}`);

  try {
    // Since purchase is a write operation, remove stale cached data for this item
    if (itemCache.has(id)) {
      itemCache.delete(id);
      console.log(`[Frontend] Cache invalidated locally before purchase for item: ${id}`);
    }

    const orderUrl = getNextOrderReplica();

    const response = await axios.post(`${orderUrl}/purchase/${id}`, req.body);

    res.json({
      servedBy: orderUrl,
      source: 'order-service',
      cacheInvalidated: true,
      ...response.data
    });
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }

    console.error(`[Frontend] Purchase request failed: ${error.message}`);
    res.status(500).json({
      message: 'Purchase request failed'
    });
  }
});

app.listen(PORT, () => {
  console.log(`[Frontend] Server running on port ${PORT}`);
});