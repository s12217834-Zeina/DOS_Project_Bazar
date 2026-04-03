const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'bazar.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      topic TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      ordered_at TEXT NOT NULL
    )
  `);

  db.get(`SELECT COUNT(*) AS count FROM books`, (err, row) => {
    if (err) {
      console.error('Error checking books table:', err.message);
      return db.close();
    }

    if (row.count === 0) {
      const stmt = db.prepare(`
        INSERT INTO books (id, title, topic, quantity, price)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(1, 'How to get a good grade in DOS in 40 minutes a day', 'distributed systems', 10, 50);
      stmt.run(2, 'RPCs for Noobs', 'distributed systems', 8, 40);
      stmt.run(3, 'Xen and the Art of Surviving Undergraduate School', 'undergraduate school', 6, 45);
      stmt.run(4, 'Cooking for the Impatient Undergrad', 'undergraduate school', 12, 30);

      stmt.finalize((finalizeErr) => {
        if (finalizeErr) {
          console.error('Error finalizing statement:', finalizeErr.message);
        } else {
          console.log('Books inserted successfully');
        }

        console.log('Database initialized at:', dbPath);
        db.close();
      });
    } else {
      console.log('Books table already contains data');
      console.log('Database initialized at:', dbPath);
      db.close();
    }
  });
});