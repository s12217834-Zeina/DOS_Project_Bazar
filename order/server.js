const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = 3002;

app.use(express.json());

const CATALOG_URL = process.env.CATALOG_URL || 'http://localhost:3001';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://frontend:3000';

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'bazar.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error(`[Order] Failed to connect to database: ${err.message}`);
  } else {
    console.log('[Order] Connected to SQLite database');
  }
});

// Send cache invalidation request to frontend before any write operation
async function invalidateFrontendCache(itemId) {
  try {
    await axios.post(`${FRONTEND_URL}/invalidate/${itemId}`);

    console.log(`[Order] Cache invalidation request sent for item ${itemId}`);
  } catch (error) {
    console.warn(`[Order] Cache invalidation failed for item ${itemId}: ${error.message}`);
  }
}

app.post('/purchase/:id', async (req, res) => {
  const id = req.params.id;
  const quantity = Number(req.body?.quantity ?? 1);

  console.log(`[Order] Purchase request received for item ${id}, quantity: ${quantity}`);

  if (isNaN(quantity) || quantity <= 0) {
    return res.status(400).json({
      message: 'Invalid quantity value'
    });
  }

  try {
    // First, query catalog to check if the item exists and has enough stock
    const catalogResponse = await axios.get(`${CATALOG_URL}/query/item/${id}`);
    const book = catalogResponse.data.item;

    if (!book) {
      return res.status(404).json({
        message: 'Item not found'
      });
    }

    if (book.quantity < quantity) {
      return res.status(400).json({
        message: 'Not enough stock available'
      });
    }

    console.log(`[Order] Item ${id} is available. Proceeding with cache invalidation`);

    // Invalidate frontend cache before writing/updating stock
    await invalidateFrontendCache(id);

    console.log(`[Order] Proceeding with stock update for item ${id}`);

    // Update stock in catalog
    const updateResponse = await axios.post(`${CATALOG_URL}/update/stock/${id}`, {
      change: -quantity
    });

    const orderedAt = new Date().toISOString();

    // Save order in orders table
    db.run(
      `INSERT INTO orders (item_id, title, quantity, status, ordered_at)
       VALUES (?, ?, ?, ?, ?)`,
      [book.id, book.title, quantity, 'SUCCESS', orderedAt],
      function (err) {
        if (err) {
          console.error(`[Order] Failed to save order: ${err.message}`);

          return res.status(500).json({
            message: 'Failed to save order'
          });
        }

        console.log(`[Order] Order saved successfully for item ${id}`);
        console.log(`[Order] Bought book: ${book.title}`);

        res.json({
          message: `Purchase completed successfully for ${quantity} cop${quantity > 1 ? 'ies' : 'y'}`,
          cacheInvalidated: true,
          order: {
            id: this.lastID,
            item_id: book.id,
            title: book.title,
            quantity,
            status: 'SUCCESS',
            ordered_at: orderedAt
          },
          stock: updateResponse.data.item
        });
      }
    );
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }

    console.error(`[Order] Purchase failed: ${error.message}`);

    res.status(500).json({
      message: 'Purchase failed'
    });
  }
});

app.listen(PORT, () => {
  console.log(`[Order] Server running on port ${PORT}`);
});