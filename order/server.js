const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = 3002;

app.use(express.json());

const CATALOG_URL = process.env.CATALOG_URL || 'http://localhost:3001';
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'bazar.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error(`[Order] Failed to connect to database: ${err.message}`);
  } else {
    console.log('[Order] Connected to SQLite database');
  }
});

app.post('/purchase/:id', async (req, res) => {
  const id = req.params.id;

  console.log(`[Order] Purchase request received for item ${id}`);

  try {
    const catalogResponse = await axios.get(`${CATALOG_URL}/query/item/${id}`);
    const book = catalogResponse.data.item;

    if (!book) {
      return res.status(404).json({
        message: 'Item not found'
      });
    }

    if (book.quantity <= 0) {
      return res.status(400).json({
        message: 'Book is out of stock'
      });
    }

    console.log(`[Order] Item ${id} is available. Proceeding with stock update`);

    const updateResponse = await axios.post(`${CATALOG_URL}/update/stock/${id}`, {
      change: -1
    });

    const orderedAt = new Date().toISOString();

    db.run(
      `INSERT INTO orders (item_id, title, status, ordered_at)
       VALUES (?, ?, ?, ?)`,
      [book.id, book.title, 'SUCCESS', orderedAt],
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
          message: 'Purchase completed successfully',
          order: {
            id: this.lastID,
            item_id: book.id,
            title: book.title,
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