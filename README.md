# Pocket mobile shop

Vite storefront with an Express and MongoDB Atlas API.

## Run locally

The API loads the existing `atlas-credentials (5).env` file automatically. Keep that file private; `.gitignore` excludes it. A random local JWT signing key is in `.env.local`.

Start both processes in separate terminals:

```sh
npm run server
npm run dev
```

Open `http://127.0.0.1:5173`. The Vite server proxies `/api` requests to the backend at port 3000. The API seeds the initial phone catalog when the MongoDB products collection is empty.

If Node cannot resolve the Atlas SRV record on your machine, add `DNS_SERVERS=<your DNS resolver>` to `.env.local`. This project's local config sets that to the resolver available in the current environment.

## Production

```sh
npm run build
npm start
```

When `dist/` exists, the API also serves the built storefront. Set `NODE_ENV=production` and configure `PORT`, `HOST`, `MONGODB_URI`, `JWT_SECRET`, and (optionally) `ADMIN_EMAIL` in the deployment environment. For Atlas URIs with `<db_username>` and `<db_password>` placeholders, also set `MONGODB_USERNAME` and `MONGODB_PASSWORD`.

To grant the admin dashboard to an account, set `ADMIN_EMAIL` to that account's email in the server environment, then sign in again. The storefront shows the Admin button for that account. The dashboard can add/update/hide products, adjust prices and stock, review customer orders, and update order and payment statuses.

Razorpay Standard Checkout is available when `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are set in `.env.local`. The catalog currently displays USD prices, so set `RAZORPAY_CURRENCY=USD`; USD acceptance requires international payments to be enabled for the Razorpay account. Use test-mode credentials first, then restart the API. Orders are created server-side; Razorpay signatures and payment status are verified before MongoDB records the paid order and reduces inventory.

## API overview

- `GET /api/health`, `GET /api/products`
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `PUT /api/auth/favorites/:productId`
- `GET /api/cart`, `PUT /api/cart`
- `POST /api/orders`, `GET /api/orders`
- `GET /api/payments/config`, `POST /api/payments/razorpay/orders`, `POST /api/payments/razorpay/verify`
- `POST /api/newsletter`
- Admin overview: `GET /api/admin/overview`
- Admin users: `GET /api/admin/users`, `PATCH /api/admin/users/:id`
- Admin product management: `GET/POST /api/admin/products`, `PATCH /api/admin/products/:id`
- Admin fulfillment: `GET /api/admin/orders`, `PATCH /api/admin/orders/:id`
- Admin payments: `GET /api/admin/payments`, `PATCH /api/admin/payments/:orderId`
- Admin newsletter subscribers: `GET /api/admin/newsletter`, `PATCH /api/admin/newsletter/:id`
- Storefront controls: `GET /api/store`, `PATCH /api/admin/store`

The admin dashboard manages accounts and roles, catalog and stock, fulfillment, payment status, subscribers, store branding, the public announcement, and checkout availability. The storefront supports cash on delivery and (when configured) Razorpay Standard Checkout. Shipping labels and newsletter delivery still need external providers; newsletter addresses are stored in MongoDB.
