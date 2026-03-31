const express = require('express');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = 3002;

app.use(express.json());

const ordersFile = path.join(__dirname, 'orders.csv');
const CATALOG_URL = 'http://catalog:3001';

function readOrders() {
    return new Promise((resolve, reject) => {
        const orders = [];

        fs.createReadStream(ordersFile)
            .pipe(csv())
            .on('data', (row) => orders.push(row))
            .on('end', () => resolve(orders))
            .on('error', (error) => reject(error));
    });
}

function appendOrder(order) {
    return new Promise((resolve, reject) => {
        const row = `\n${order.order_id},${order.item_id},${order.title},${order.status},${order.timestamp}`;

        fs.appendFile(ordersFile, row, (error) => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });
}

app.post('/purchase/:id', async (req, res) => {
    try {
        const id = req.params.id;

        const catalogResponse = await axios.get(`${CATALOG_URL}/query/item/${id}`);
        const book = catalogResponse.data;

        if (book.quantity <= 0) {
            return res.status(400).json({ error: 'Book is out of stock' });
        }

        await axios.post(`${CATALOG_URL}/update/stock/${id}`, {
            change: -1
        });

        const orders = await readOrders();
        const newOrder = {
            order_id: orders.length + 1,
            item_id: book.id,
            title: book.title,
            status: 'SUCCESS',
            timestamp: new Date().toISOString()
        };

        await appendOrder(newOrder);

        console.log(`bought book ${book.title}`);

        res.json({
            message: 'Purchase completed successfully',
            order: newOrder
        });
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return res.status(404).json({ error: 'Item not found' });
        }

        res.status(500).json({ error: 'Purchase failed' });
    }
});

app.listen(PORT, () => {
    console.log(`Order server running on port ${PORT}`);
});