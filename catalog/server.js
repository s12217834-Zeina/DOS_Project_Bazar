const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3001;

app.use(express.json());

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'bazar.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error(`[Catalog] Failed to connect to database: ${err.message}`);
  } else {
    console.log('[Catalog] Connected to SQLite database');
  }
});

app.get('/query/topic/:topic', (req, res) => {
  const topic = req.params.topic.toLowerCase();

  console.log(`[Catalog] Query by topic received: ${topic}`);

  db.all(
    `SELECT id, title FROM books WHERE LOWER(topic) = ?`,
    [topic],
    (err, rows) => {
      if (err) {
        console.error(`[Catalog] Failed to query by topic: ${err.message}`);
        return res.status(500).json({
          message: 'Failed to retrieve books by topic'
        });
      }

      res.json({
        message: 'Books retrieved successfully',
        items: rows
      });
    }
  );
});

app.get('/query/item/:id', (req, res) => {
  const id = req.params.id;

  console.log(`[Catalog] Query by item received: ${id}`);

  db.get(
    `SELECT id, title, topic, quantity, price FROM books WHERE id = ?`,
    [id],
    (err, row) => {
      if (err) {
        console.error(`[Catalog] Failed to query item: ${err.message}`);
        return res.status(500).json({
          message: 'Failed to retrieve item details'
        });
      }

      if (!row) {
        return res.status(404).json({
          message: 'Item not found'
        });
      }

      res.json({
        message: 'Item details retrieved successfully',
        item: row
      });
    }
  );
});

app.post('/update/stock/:id', (req, res) => {
  const id = req.params.id;
  const change = Number(req.body?.change ?? req.query.change);

  console.log(`[Catalog] Stock update request received for item ${id}, change: ${change}`);

  if (isNaN(change)) {
    return res.status(400).json({
      message: 'Invalid stock change value'
    });
  }

  db.get(`SELECT * FROM books WHERE id = ?`, [id], (err, book) => {
    if (err) {
      console.error(`[Catalog] Failed to read item before stock update: ${err.message}`);
      return res.status(500).json({
        message: 'Failed to retrieve item before stock update'
      });
    }

    if (!book) {
      return res.status(404).json({
        message: 'Item not found'
      });
    }

    const newQuantity = book.quantity + change;

    if (newQuantity < 0) {
      return res.status(400).json({
        message: 'Not enough stock available'
      });
    }

    db.run(
      `UPDATE books SET quantity = ? WHERE id = ?`,
      [newQuantity, id],
      function (updateErr) {
        if (updateErr) {
          console.error(`[Catalog] Failed to update stock: ${updateErr.message}`);
          return res.status(500).json({
            message: 'Failed to update stock'
          });
        }

        console.log(`[Catalog] Stock updated successfully for item ${id}. New quantity: ${newQuantity}`);

        res.json({
          message: 'Stock updated successfully',
          item: {
            id: book.id,
            title: book.title,
            quantity: newQuantity
          }
        });
      }
    );
  });
});

app.post('/update/price/:id', (req, res) => {
  const id = req.params.id;
  const price = Number(req.body?.price ?? req.query.price);

  console.log(`[Catalog] Price update request received for item ${id}, new price: ${price}`);

  if (isNaN(price) || price < 0) {
    return res.status(400).json({
      message: 'Invalid price value'
    });
  }

  db.run(
    `UPDATE books SET price = ? WHERE id = ?`,
    [price, id],
    function (err) {
      if (err) {
        console.error(`[Catalog] Failed to update price: ${err.message}`);
        return res.status(500).json({
          message: 'Failed to update price'
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({
          message: 'Item not found'
        });
      }

      console.log(`[Catalog] Price updated successfully for item ${id}. New price: ${price}`);

      res.json({
        message: 'Price updated successfully',
        item: {
          id: Number(id),
          price
        }
      });
    }
  );
});

app.listen(PORT, () => {
  console.log(`[Catalog] Server running on port ${PORT}`);
});