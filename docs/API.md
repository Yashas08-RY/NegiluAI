# ನೇಗಿಲುai API contract

Base URL during development: `http://127.0.0.1:8000/api`

Protected endpoints require `Authorization: Bearer <access-token>`. All request
and response bodies use JSON, except product-image uploads, which use
`multipart/form-data`.

## Authentication

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/register/` | Public | Create a farmer or consumer account. Body: `username`, `email`, `password`, `role`. |
| POST | `/login/` | Public | Sign in. Body: `username`, `password`. Returns `access`, `refresh`, and user role. |
| GET | `/profile/` | Signed in | Return the signed-in user's basic profile. |
| PATCH | `/profile/` | Signed in | Update name, email, and farmer profile fields. |
| POST | `/profile/change-password/` | Signed in | Change the password after checking the current password. |
| POST | `/token/refresh/` | Public | Exchange a valid refresh token for a new access token. |
| POST | `/auth/send-otp/` | Public | Send an email password-reset code. Body: `email`. |
| POST | `/auth/verify-otp/` | Public | Verify the code. Body: `email`, `code`; returns `reset_token`. |
| POST | `/auth/reset-password/` | Public | Set a new password. Body: `email`, `reset_token`, `password`. |

Password-reset codes expire after 10 minutes, can be used once, and allow at most
five verification attempts. Requests are limited to five per account per hour.

## Products and discovery

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/products/` | Public | Paginated product listing. Supports search, filters, and ordering. |
| POST | `/products/` | Verified farmer | Create a product. New listings are pending admin approval. |
| GET | `/products/{id}/` | Public | Get product details. |
| PATCH / DELETE | `/products/{id}/` | Owning farmer | Edit or remove a product. |
| GET / POST | `/products/{id}/images/` | Public / owning farmer | List or upload product images. |
| DELETE | `/products/{id}/images/{image_id}/` | Owning farmer | Delete an image. |
| POST | `/products/{id}/images/{image_id}/primary/` | Owning farmer | Set the primary image. |
| GET / POST | `/products/{id}/reviews/` | Public / delivered-purchase consumer | List reviews or create/update the caller's review. |
| GET | `/wishlist/wishlist/` | Signed in | List the caller's wishlist. |
| POST | `/wishlist/wishlist/toggle/` | Signed in | Add or remove a product. Body: `product_id`. |

## Cart, orders, and payments

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/carts/current/` | Consumer | Get or create the caller's cart. |
| POST | `/cart-items/` | Consumer | Add an item. Body: `product`, `quantity`. |
| PATCH / DELETE | `/cart-items/{id}/` | Consumer | Update quantity or remove an item. |
| POST | `/carts/checkout/` | Consumer | Create an order. Body: `delivery_address`. |
| GET | `/orders/` | Signed in | List the caller's orders. |
| GET | `/orders/{id}/` | Owner | Get an order. |
| POST | `/orders/{id}/create-payment-order/` | Owner | Create/reuse a Razorpay payment order. |
| POST | `/orders/{id}/verify-payment/` | Owner | Verify Razorpay checkout data. |
| POST | `/orders/{id}/cancel/` | Owner | Cancel an unpaid order and release its stock reservation. |
| POST | `/orders/razorpay-webhook/` | Razorpay | Signed payment event receiver; no user login. |
| GET | `/farmer/order-items/` | Farmer | Paginated fulfilment items for products owned by the caller only. Includes the delivery address, buyer username, and item/order tracking data needed to fulfil that item. |
| GET | `/farmer/order-items/{id}/` | Owning farmer | Retrieve one owned fulfilment item. Other farmers receive `404`. |
| POST | `/farmer/orders/{id}/transition/` | Farmer owning every item | Advance a fully owned paid order. Body: `status` plus `courier_name` and `tracking_id` when shipping. |

`POST /farmer/orders/{id}/transition/` permits only `confirmed → processing`,
`processing → shipped`, and `shipped → delivered`. Shipping requires a non-empty
`courier_name` and `tracking_id`, and records `shipped_at`; delivery records
`delivered_at`. A farmer receives `403` if any item belongs to a different farmer,
and invalid transitions return `400`.

Checkout reserves stock for 15 minutes. A failed payment, cancellation, or expired
reservation returns stock once only. The next payment milestone is a verified
Razorpay webhook with duplicate-event protection. Configure `RAZORPAY_WEBHOOK_SECRET`
and subscribe Razorpay to `payment.captured`, `payment.failed`, and `order.paid`.

## Dashboards

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/dashboard/farmer/overview/` | Farmer | Product, sales, and revenue summary. |
| GET | `/dashboard/farmer/products/` | Farmer | The caller's products. |
| GET | `/dashboard/farmer/sales/` | Farmer | Items sold by the caller. |
| GET | `/dashboard/consumer/overview/` | Signed in | Consumer order, spend, cart, and wishlist totals. |
| GET | `/dashboard/admin/overview/` | Admin | Platform totals. |
| GET | `/dashboard/admin/users/` | Admin | User list. |
| POST | `/dashboard/admin/users/{id}/verify/` | Admin | Toggle farmer verification. |
| POST | `/dashboard/admin/products/{id}/approve/` | Admin | Set `status` to `approved`, `rejected`, or `pending`; rejected listings may include `moderation_note`. |

## Response and error conventions

- Successful create requests return `201`; successful delete requests return `204`.
- Validation errors return `400` with field-specific details.
- Unauthenticated requests return `401`; unauthorized roles return `403`.
- List endpoints are paginated unless otherwise noted and return `count`, `next`,
  `previous`, and `results`.

## API schema

The generated OpenAPI schema is available at `GET /schema/`; Swagger UI is at
`GET /docs/`. Both paths are relative to the API base URL (for example,
`http://127.0.0.1:8000/api/docs/`).

## Baseline predictions

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/predictions/yield/` | Signed in | Proxy a baseline yield calculation. Body: `crop`, `area_hectares`, optional `previous_yield_t_per_hectare`, `season` (`kharif`, `rabi`, `zaid`). |
| POST | `/predictions/price/` | Signed in | Proxy a baseline price response. Body: `crop`, `location`, optional `season`. |

Both return `prediction`, `unit`, `model_type` (`baseline`), and a disclaimer.
The React client calls these Django endpoints, never the internal FastAPI service.
An unavailable ML service produces `503`; a malformed upstream response produces `502`.

## Reservation maintenance

Run `python manage.py release_expired_reservations` every five minutes in production.
It returns stock only for expired `pending` reservations and is safe to repeat. See
`docs/DEPLOYMENT.md` for cron, Windows Task Scheduler, Render, and Railway examples.
