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

  try {
    const catalogUrl = getNextCatalogReplica();

    const response = await axios.get(`${catalogUrl}/query/item/${id}`);

    res.json({
      message: 'Item details retrieved successfully',
      servedBy: catalogUrl,
      item: response.data.item
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
    const orderUrl = getNextOrderReplica();

    const response = await axios.post(`${orderUrl}/purchase/${id}`, req.body);

    res.json({
      servedBy: orderUrl,
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