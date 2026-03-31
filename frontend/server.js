const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 3000;

app.use(express.json());

const CATALOG_URL = 'http://catalog:3001';
const ORDER_URL = 'http://order:3002';

app.get('/search/:topic', async (req, res) => {
    try {
        const topic = req.params.topic;
        const encodedTopic = encodeURIComponent(topic);
        const response = await axios.get(`${CATALOG_URL}/query/topic/${encodedTopic}`);
        console.log(`search request for topic: ${topic}`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Search failed' });
    }
});

app.get('/info/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const response = await axios.get(`${CATALOG_URL}/query/item/${id}`);
        console.log(`info request for item: ${id}`);
        res.json(response.data);
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return res.status(404).json({ error: 'Item not found' });
        }

        res.status(500).json({ error: 'Info request failed' });
    }
});

app.post('/purchase/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const response = await axios.post(`${ORDER_URL}/purchase/${id}`);
        console.log(`purchase request for item: ${id}`);
        res.json(response.data);
    } catch (error) {
        if (error.response) {
            return res.status(error.response.status).json(error.response.data);
        }

        res.status(500).json({ error: 'Purchase request failed' });
    }
});

app.listen(PORT, () => {
    console.log(`Front-end server running on port ${PORT}`);
});