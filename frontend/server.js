const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 3000;

app.use(express.json());

const CATALOG_URL = process.env.CATALOG_URL || 'http://localhost:3001';
const ORDER_URL = process.env.ORDER_URL || 'http://localhost:3002';

app.get('/search/:topic', async (req, res) => {
  const topic = req.params.topic;

  console.log(`[Frontend] Search request received for topic: ${topic}`);

  try {
    const response = await axios.get(`${CATALOG_URL}/query/topic/${encodeURIComponent(topic)}`);

    res.json({
      message: 'Search completed successfully',
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
    const response = await axios.get(`${CATALOG_URL}/query/item/${id}`);

    res.json({
      message: 'Item details retrieved successfully',
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
    const response = await axios.post(`${ORDER_URL}/purchase/${id}`);
    res.json(response.data);
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