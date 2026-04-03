# DOS_Project_Bazar

# Bazar.com - Multi-tier Online Book Store

## Project Overview
This project implements a small online bookstore called **Bazar.com** using a multi-tier microservices architecture.  
The system provides three main operations: searching books by topic, retrieving book details by item ID, and purchasing a book.

The system is divided into three services:
- **Frontend Service**
- **Catalog Service**
- **Order Service**

The services communicate using HTTP REST APIs, and data is stored persistently using **SQLite**.

---

## Architecture

### Frontend Service
Receives user requests and forwards them to the appropriate backend service.

### Catalog Service
Stores book data and supports:
- searching by topic
- retrieving item details
- updating stock
- updating price

### Order Service
Handles purchase requests by:
- checking book availability
- decreasing stock quantity
- saving the order in the database

---

## Technologies Used
- Node.js
- Express.js
- SQLite
- Docker
- Docker Compose

---

## Project Structure

```text
bazar-com/
├── catalog/
├── order/
├── frontend/
├── data/
│   └── bazar.db
├── init-db.js
├── docker-compose.yml
└── README.md