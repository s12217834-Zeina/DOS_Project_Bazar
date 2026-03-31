const express = require('express');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(express.json());

const catalogFile = path.join(__dirname, 'catalog.csv');

function readCatalog() {
    return new Promise((resolve, reject) => {
        const books = [];

        fs.createReadStream(catalogFile)
            .pipe(csv())
            .on('data', (row) => books.push(row))
            .on('end', () => resolve(books))
            .on('error', (error) => reject(error));
    });
}

app.get('/query/topic/:topic', async (req, res) => {
    try {
        const topic = req.params.topic.toLowerCase();
        const books = await readCatalog();

        const result = books
            .filter(book => book.topic.toLowerCase() === topic)
            .map(book => ({
                id: Number(book.id),
                title: book.title
            }));

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read catalog' });
    }
});

app.get('/query/item/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const books = await readCatalog();

        const book = books.find(book => book.id === id);

        if (!book) {
            return res.status(404).json({ error: 'Item not found' });
        }

        res.json({
            id: Number(book.id),
            title: book.title,
            topic: book.topic,
            quantity: Number(book.quantity),
            price: Number(book.price)
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to read catalog' });
    }
});


function writeCatalog(books) {
    return new Promise((resolve, reject) => {
        const header = 'id,title,topic,quantity,price\n';

        const rows = books.map(book =>
            `${book.id},${book.title},${book.topic},${book.quantity},${book.price}`
        ).join('\n');

        fs.writeFile(catalogFile, header + rows, (error) => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });
}

app.post('/update/stock/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const change = Number(req.body.change);

        if (isNaN(change)) {
            return res.status(400).json({ error: 'Invalid stock change value' });
        }

        const books = await readCatalog();
        const book = books.find(book => book.id === id);

        if (!book) {
            return res.status(404).json({ error: 'Item not found' });
        }

        const newQuantity = Number(book.quantity) + change;

        if (newQuantity < 0) {
            return res.status(400).json({ error: 'Not enough stock' });
        }

        book.quantity = newQuantity;

        await writeCatalog(books);

        res.json({
            message: 'Stock updated successfully',
            id: Number(book.id),
            title: book.title,
            quantity: Number(book.quantity)
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update stock' });
    }
});

app.listen(PORT, () => {
    console.log(`Catalog server running on port ${PORT}`);
});