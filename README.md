# Goog Backend (PostgreSQL version)

## Setup
1. Copy `.env.example` to `.env` and fill in values
2. Run `npm install`
3. Run `npm start`
4. Use `/api/admin/migrate` to create tables (requires X-Admin-Key header)

## API
- POST /api/orders/create
- GET /api/payment/notify
- GET /api/delivery/instant/:orderNo?key=...
- POST /api/admin/import-cards
- GET /api/admin/inventory/:categoryId
