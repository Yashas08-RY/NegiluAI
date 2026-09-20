# Technical Documentation — ನೇಗಿಲುai (NegiluAI)

## 1. System Architecture

### 1.1 Architectural overview

NegiluAI is a role-based agricultural marketplace that connects verified farmers with consumers, while giving administrators the ability to verify farmers and moderate listings. The system follows a layered client-server architecture with a separate, internal prediction service. This separation is useful because the user interface, marketplace rules, payment processing, and prediction logic can evolve independently without exposing internal services directly to a browser.

The presentation layer is implemented as a React 19 single-page application (SPA) in `frontend/src`. Vite builds and serves the application, TypeScript provides type checking, Tailwind CSS v4 provides responsive styling, and `motion/react`, `lucide-react`, and Recharts are used for animation, icons, and visual analytics respectively. `App.tsx` acts as the main application shell and lightweight route dispatcher. It renders pages such as `FarmerDashboardPage`, `FarmerProductsPage`, `FarmerOrdersPage`, `ConsumerDashboardPage`, `ConsumerOrdersPage`, `CartPage`, `WishlistPage`, `AIPredictionPage`, `AdminDashboardPage`, `AdminUsersPage`, and `AdminProductsPage`.

Authentication state is centralized in `auth/AuthContext.tsx`. After sign-in, it stores the JWT access token, refresh token, and normalized user profile in browser local storage under `negiluai.auth`. `api/client.ts` is the common HTTP boundary: it adds the bearer token to requests, converts failed responses into user-facing errors, and logs the user out and redirects to the login page when the API returns HTTP 401. `RouteGuards.tsx` contains `ProtectedRoute` and `RoleRoute`, which prevent a user from opening a page that does not match their role.

The application layer is a Django 5.2 REST API in `backend`. The project-level `config` module supplies settings and top-level URL routing. Its domain modules are deliberately separated:

- `users` owns registration, login, JWT-backed profile access, farmer profile information, and the password-reset-code process.
- `products` owns product listings, product images, search/filtering, wishlists, reviews, farmer ownership checks, and product approval status.
- `orders` owns carts, cart items, checkout, stock reservation/release, orders, payment records, Razorpay verification, webhooks, and farmer fulfilment transitions.
- `dashboard` provides farmer, consumer, and administrator aggregates, management endpoints, and the safe proxy endpoints for prediction requests.

The persistence layer uses Django ORM models. PostgreSQL is the intended production database when `POSTGRES_*` variables are configured; SQLite is an explicit local-development fallback. Uploaded product and profile images are managed through Django media storage. Core persistent records are `User`, `FarmerProfile`, `PasswordResetCode`, `Product`, `ProductImage`, `Wishlist`, `Review`, `Cart`, `CartItem`, `Order`, `OrderItem`, `Payment`, and `PaymentWebhookEvent`.

The prediction capability is isolated in `ml-service/main.py`, a FastAPI service. The React application never contacts this service itself. Instead, `dashboard/ml_views.py` validates authenticated requests, `dashboard/ml_client.py` makes a short-lived server-to-server request, and the Django API returns the result to the client. At present this is explicitly a transparent **baseline** service: yield is calculated from area and optional previous yield, while price returns a neutral placeholder of `0.0`. It must not be described as a trained or validated machine-learning model in the thesis.

Razorpay is the external payment provider. Django creates a Razorpay order, verifies the payment signature returned by checkout, and independently receives signed Razorpay webhooks. This independent webhook path and the `PaymentWebhookEvent` store protect against duplicate payment events and give the server an authoritative payment confirmation route.

### 1.2 Why this architecture was chosen

The architecture is appropriate for a marketplace because each layer has a clear responsibility. React gives farmers, consumers, and administrators responsive role-specific workspaces without server-rendering every interaction. Django REST Framework is well suited to validation, permissions, transactions, relational data, and admin-facing operations. The separate FastAPI prediction service avoids mixing experimental analytical logic with the marketplace transaction layer. Finally, keeping Razorpay, email delivery, database credentials, CORS origins, HTTPS settings, and the ML-service URL in configuration/environment variables prevents sensitive configuration from being placed in the frontend source code.

The design also protects business rules at the server rather than trusting the interface. For example, only a verified farmer can create a product, only the owning farmer can edit it, only consumers can use carts and checkout, only a customer with a delivered purchase can review a product, and only an administrator can verify farmers or approve listings. During checkout, database transactions and row-level locks prevent two consumers from purchasing the same remaining stock.

### 1.3 Architecture diagram specification

Draw the diagram in five horizontal layers. Use solid arrows for request/response communication and a dashed arrow for the background reservation-maintenance task.

1. **Actors layer (top):** draw three boxes labelled `Farmer`, `Consumer`, and `Administrator`. Draw a separate external-system box labelled `Razorpay Payment Gateway`. Optionally add `Email/SMTP Service` beside it for password-reset mail.
2. **Client layer:** draw one large box labelled `React 19 SPA (frontend/src)`. Inside it, add smaller boxes: `App.tsx and navigation.ts`, `AuthContext.tsx + RouteGuards.tsx`, `api.ts + api/client.ts`, `Farmer / Consumer / Admin Pages`, and `AIPredictionPage`. Connect each actor to the React SPA. Connect the page boxes to `api.ts + api/client.ts`; connect the API client to `AuthContext.tsx` to show token supply and 401 logout handling.
3. **Application/API layer:** draw a large box labelled `Django 5.2 + Django REST Framework (backend/config)`. Inside it, draw four peer boxes: `users`, `products`, `orders`, and `dashboard`. Add a small cross-cutting box labelled `JWT Authentication, Serializers, Permissions, CORS and OpenAPI`. Connect the React API client to this Django box with the label `HTTPS/JSON REST API + Bearer JWT`.
4. **Service-integration layer:** to the right of Django, draw `Razorpay SDK / signed webhook`, `FastAPI ML Service (ml-service/main.py)`, and `Email/SMTP Service`. Draw `orders → Razorpay` with labels `create payment order`, `verify signature`, and `webhook`. Draw `dashboard → FastAPI ML Service` with the label `validated server-to-server prediction request`. Draw `users → Email/SMTP Service` with the label `password reset code`. Do **not** connect the React application directly to FastAPI.
5. **Data layer (bottom):** draw a cylinder labelled `PostgreSQL (production) / SQLite (local development)` and divide it conceptually into `users data`, `product/catalogue data`, `cart/order/payment data`, and `dashboard query data`. Draw arrows from all four Django modules to this cylinder. Draw a separate cylinder or folder labelled `Django Media Storage` and connect it to `products` and `users` for product images and profile pictures. Add a dashed arrow from `release_expired_reservations` to the order/payment data section, labelled `runs periodically; releases expired pending reservations`.

## 2. Methodology

### 2.1 Development approach

The project can be described as an iterative, feature-oriented development process. Instead of attempting to build every screen first, the system was divided into functional vertical slices: identity and access; farmer catalogue management; consumer discovery, cart, and ordering; payment and fulfilment; dashboards and administration; and crop-intelligence requests. Each slice contains its interface, API contract, validation rules, persistence changes, and error handling. This approach is suitable for a college project because each feature can be demonstrated independently while still contributing to one coherent marketplace.

### 2.2 Step-by-step methodology used

1. **Problem and role identification.** The platform was framed around three real marketplace roles: farmers who list produce, consumers who discover and buy produce, and administrators who establish trust through farmer verification and listing moderation. This led to the `User.role` field and the role-specific dashboards.

2. **Domain modelling.** The main entities were modelled before implementing screens: `FarmerProfile` extends a farmer account; `Product` and `ProductImage` represent a listing; `Wishlist` and `Review` represent consumer engagement; `Cart` and `CartItem` represent a pre-purchase selection; and `Order`, `OrderItem`, `Payment`, and `PaymentWebhookEvent` represent a durable purchase trail. Foreign keys, one-to-one relations, and unique constraints were used to express business relationships, such as one cart per user and one wishlist record per user-product pair.

3. **REST API construction.** Django REST Framework view sets, serializers, routers, filters, pagination, and action endpoints were used to implement the API. The public discovery endpoints remain readable without login, while mutation endpoints use JWT authentication plus role and ownership permissions. API documentation is generated through drf-spectacular at `/api/schema/` and `/api/docs/`.

4. **Authentication and authorization.** Registration and login were implemented in the `users` module. Login issues SimpleJWT access and refresh tokens. The browser restores a session through `AuthContext`, retrieves the profile, and renders the correct role workspace. The API repeats enforcement using `IsFarmer`, `IsVerifiedFarmer`, `IsProductOwner`, `IsConsumer`, and administrator checks; this is important because client-side route guards alone are not a security boundary.

5. **Farmer catalogue workflow.** `FarmerProductsPage` sends create, update, delete, and image requests through `api.ts` to `ProductViewSet`. A product starts with `approval_status = pending`; an administrator uses `AdminProductsPage` and the admin approval endpoint to approve, reject, or return it to pending. Public product queries expose only approved products, while a farmer can still see their own pending or rejected listings.

6. **Consumer purchase workflow.** `App.tsx`, `CartPage`, `WishlistPage`, `ProductDetailPage`, and `ConsumerOrdersPage` support discovery, saved items, cart maintenance, checkout, payment, and order visibility. At checkout, `orders/services.py::checkout_cart` runs in a database transaction, locks each product row, validates availability and quantity, copies product details into `OrderItem`, reduces stock, creates a 15-minute reservation, calculates the total, and clears the cart.

7. **Payment and recovery design.** `orders/payment_services.py` creates Razorpay orders and verifies signatures. A successful payment changes the payment to `paid` and order to `confirmed`. Failed, cancelled, or expired pending orders release reserved stock exactly once through `release_order_stock`. A periodic `release_expired_reservations` management command makes recovery possible even when the buyer leaves the payment page.

8. **Fulfilment and feedback.** A farmer who owns every item in a paid order can progress it through `confirmed → processing → shipped → delivered`. Shipping requires a courier name and tracking ID. Only after delivery can the consumer submit or update one review for that product. This connects reviews to a completed transaction rather than allowing arbitrary ratings.

9. **Dashboard and prediction integration.** The `dashboard` module computes summaries from the same operational records instead of duplicating data. `AIPredictionPage` submits input to Django, which validates it and proxies it to FastAPI. This keeps the ML service private, allows a controlled timeout, and returns meaningful 502/503 errors if it fails.

10. **Verification and deployment readiness.** The project includes endpoint tests in each Django module, CORS configuration for the Vite client, optional PostgreSQL configuration, media configuration, password validation, HTTPS-related settings, and deployment notes. The frontend is built with Vite and TypeScript, while the backend dependencies include Django, Django REST Framework, SimpleJWT, django-filter, Pillow, Razorpay, and requests; the ML service uses FastAPI, Pydantic, and Uvicorn.

### 2.3 Key design decisions and rationale

| Design decision | Reasoning |
| --- | --- |
| JWT bearer authentication | A SPA needs an API-friendly, stateless way to attach identity to requests. The access token is short lived (60 minutes), while refresh-token support allows renewal. |
| Role checks in both UI and API | `RoleRoute` improves usability by directing a user to the right workspace; Django permissions preserve security if an endpoint is called directly. |
| Product approval and farmer verification | The two-stage trust model prevents unverified farmers from listing and prevents unapproved listings from reaching public consumers. |
| Transactional checkout and stock reservation | Locks and a 15-minute reservation reduce overselling and make temporary payment abandonment recoverable. |
| Razorpay webhook event store | Payment providers can retry webhooks. `PaymentWebhookEvent` makes duplicate events harmless and gives an audit trail. |
| FastAPI behind Django | The marketplace API remains the only browser-facing backend, so validation, access control, error conversion, and later model replacement remain centralized. |

## 3. Data Flow Diagram (DFD)

### 3.1 Level 0 — Context diagram

The Level 0 diagram treats **NegiluAI Marketplace System** as one central process. The following are the diagram nodes and labelled arrows.

| Node type | Node label | Data flows to draw |
| --- | --- | --- |
| External entity | `Farmer` | Farmer → System: registration/profile details, product details, images, fulfilment status, tracking details, prediction input. System → Farmer: JWT/session result, approval/verification feedback, dashboard data, sales/order data, prediction response. |
| External entity | `Consumer` | Consumer → System: registration/login details, search/filter criteria, wishlist/cart operations, delivery address, payment initiation, review. System → Consumer: product catalogue, cart/order details, payment result, order status, review result. |
| External entity | `Administrator` | Administrator → System: farmer-verification decision, product-moderation decision. System → Administrator: platform statistics, user list, pending farmers, pending products. |
| External entity | `Razorpay Payment Gateway` | System → Razorpay: payment-order amount, currency, receipt/reference. Razorpay → System: signed checkout data and signed payment webhooks. |
| External entity | `Email/SMTP Service` | System → Email service: password-reset email containing a one-time code. Email service → System: delivery success/failure. |
| Central process | `0. NegiluAI Marketplace System` | Connect all entities above to this single rounded process box. |

### 3.2 Level 1 — Decomposition of the marketplace system

For the Level 1 DFD, replace Process 0 with the following numbered processes. Keep the external entities from Level 0 and add the data stores shown below.

#### External entities

- `E1 Farmer`
- `E2 Consumer`
- `E3 Administrator`
- `E4 Razorpay Payment Gateway`
- `E5 Email/SMTP Service`

#### Processes

1. `1.0 Identity and Profile Management (users)` — registration, login, profile read/update, JWT issue/refresh, password reset.
2. `2.0 Product Catalogue and Trust Management (products + admin dashboard)` — product CRUD, image management, search/filtering, farmer verification, listing approval, wishlist, and reviews.
3. `3.0 Cart, Checkout, Payment and Fulfilment (orders)` — cart changes, transactional checkout, stock reservation/release, Razorpay creation/verification/webhooks, cancellation, and delivery progression.
4. `4.0 Dashboard and Reporting (dashboard)` — farmer overview/products/sales, consumer overview, and administrator overview/users.
5. `5.0 Crop Intelligence Gateway (dashboard/ml_views + ml-service)` — validates authenticated yield/price requests, calls the internal FastAPI service, and returns baseline results or service errors.

#### Data stores

- `D1 User and Farmer Profile Store` — `User`, `FarmerProfile`, `PasswordResetCode`.
- `D2 Product Catalogue Store` — `Product`, `ProductImage`, `Wishlist`, `Review`, and media files.
- `D3 Cart Store` — `Cart`, `CartItem`.
- `D4 Order and Payment Store` — `Order`, `OrderItem`, `Payment`, `PaymentWebhookEvent`.
- `D5 Prediction Service` — FastAPI in-memory request/response endpoint; it is an internal service, not the permanent marketplace database.

#### Arrows to draw

1. Draw `E1 Farmer → 1.0` labelled `registration/login/profile data`; draw `1.0 → E1` labelled `JWT, profile, reset result`. Draw the same pair between `E2 Consumer` and `1.0`. Draw `1.0 ↔ D1` labelled `account, profile and reset-code records`. Draw `1.0 → E5` labelled `password reset code email`.
2. Draw `E1 Farmer → 2.0` labelled `product details, updates and images`; draw `2.0 → E1` labelled `listing status and product data`. Draw `E2 Consumer → 2.0` labelled `search/filter, wishlist and review input`; draw `2.0 → E2` labelled `approved products, images, ratings and wishlist result`. Draw `E3 Administrator → 2.0` labelled `farmer verification and approval decision`; draw `2.0 → E3` labelled `pending profiles/listings and moderation result`. Draw `2.0 ↔ D1` for verification status and `2.0 ↔ D2` for product, image, wishlist, review, and approval records.
3. Draw `E2 Consumer → 3.0` labelled `cart item/quantity, delivery address, payment/cancellation request`; draw `3.0 → E2` labelled `cart, order, payment and status information`. Draw `E1 Farmer → 3.0` labelled `processing/shipping/delivery update`; draw `3.0 → E1` labelled `owned fulfilment order items`. Draw `3.0 ↔ D2` labelled `product availability and stock quantity`; `3.0 ↔ D3` labelled `cart and cart items`; and `3.0 ↔ D4` labelled `orders, reservations, payments and webhook events`. Draw `3.0 → E4` labelled `create Razorpay order`; draw `E4 → 3.0` labelled `signed payment details/webhook`.
4. Draw `E1 Farmer ↔ 4.0` labelled `farmer dashboard request/overview and sales`; `E2 Consumer ↔ 4.0` labelled `consumer overview request/totals`; and `E3 Administrator ↔ 4.0` labelled `admin dashboard request/platform totals and users`. Draw `4.0` to `D1`, `D2`, and `D4` with read arrows because dashboard data is aggregated from these stores.
5. Draw `E1 Farmer → 5.0` labelled `crop, location, season, area, previous yield`; draw `5.0 → E1` labelled `baseline yield and price response/disclaimer`. Draw `5.0 ↔ D5` labelled `validated internal prediction request/response`.

## 4. Control Flow Diagram

The control-flow diagram should show decisions, not simply data movement. Use rounded rectangles for start/end, rectangles for actions, diamonds for decisions, and arrows for the path of control. The following diagram specification combines the major runtime paths.

### 4.1 Request entry, authentication, and authorization

1. `Start` → `User opens URL in App.tsx`.
2. `App.tsx receives route change` → `Does the path match login, signup, or forgot-password?`
3. **Yes** → render `AuthPage` or `ForgotPasswordPage` → submit request through `api.ts` → `users` view validates data → return success or validation error → display result → `End/current page`.
4. **No** → `Is the route in protectedRoutes?`
5. **No** → render public home/information route.
6. **Yes** → `AuthProvider restoring or checking session?`
7. **Yes** → show `Loading your account…` → wait for profile result → continue.
8. `Is authenticated?`
9. **No** → `navigate(/login?next=...)` → render login page.
10. **Yes** → `Does RoleRoute require farmer, consumer, or admin?`
11. **No role required** → render page, for example `ProfilePage` or `AIPredictionPage`.
12. **Role required and role matches** → render requested role page.
13. **Role required and role does not match** → calculate `dashboardPathForRole(activeRole)` → redirect to the user’s own dashboard.
14. For every API call: `api/client.ts adds access token` → `HTTP response is 401?` → **Yes:** call `onUnauthorized`, remove `negiluai.auth`, redirect to login. **No:** return JSON or present an API error.

### 4.2 Cart and checkout control flow

1. `Consumer chooses Add to cart` → `Is user authenticated?` If no, navigate to login. If yes, continue.
2. `Is role consumer?` If no, show “Only consumer accounts can add products to a cart.” If yes, call `POST /cart-items/`.
3. Server checks: `Is product owned by requesting consumer?` If yes, reject. Otherwise, `Is product approved, available, and sufficiently stocked?` If no, reject with a validation error. If yes, `Does CartItem already exist?` If yes, increment quantity after stock validation; otherwise create it.
4. `Consumer submits checkout address` → `release_expired_stock_reservations()` → validate address → `checkout_cart()` transaction begins.
5. `Is cart empty?` If yes, roll back and return error. If no, create pending `Order` with 15-minute expiry.
6. For **each CartItem** (draw a loop back to this step): lock the corresponding `Product`; `available and quantity sufficient?` If no, roll back all checkout work and return error. If yes, create `OrderItem`, reduce product quantity, set unavailable if zero, and add subtotal to total.
7. `More cart items?` If yes, loop to Step 6. If no, save the order total, delete cart items, commit transaction, and return the new order.
8. `Consumer starts payment` → `create_razorpay_order()` → `Order status pending and stock not released?` If no, reject. If yes, reuse existing payment order if available; otherwise create a Razorpay order and return its ID/key/amount.
9. `Razorpay checkout result received` → verify payment signature. `Signature valid?` If no, mark payment failed, release stock once, return failure. If yes, mark payment paid and order confirmed.
10. `Signed Razorpay webhook received` → `Webhook signature valid?` If no, return 400. If yes, `event ID already stored?` If yes, ignore safely. If no, store event and process it: captured/paid confirms order; failed payment releases stock if it has not been paid.

### 4.3 Farmer fulfilment and review control flow

1. `Farmer selects order update` → `Is caller a farmer?` If no, return 403.
2. Load and lock order → `Does every order item belong to this farmer?` If no, return 403. This prevents a farmer from changing a mixed-owner order.
3. Validate requested status → `Is requested transition the only allowed next transition?`
4. **confirmed → processing:** save status.
5. **processing → shipped:** `courier_name and tracking_id supplied?` If no, return validation error; if yes, save status, courier, tracking ID, and `shipped_at`.
6. **shipped → delivered:** save status and `delivered_at`.
7. Any other status combination → return “Cannot transition” error.
8. `Consumer submits review` → `consumer role?` If no, return 403. `Has delivered order containing this product?` If no, return 403. `Rating between 1 and 5?` If no, return 400. If yes, create or update the unique review record.

### 4.4 Prediction-request control flow

1. `Authenticated user submits AIPredictionPage form` → browser checks non-empty location and area greater than zero.
2. If invalid → show inline form error. If valid → run yield and price requests in parallel using `Promise.all`.
3. Django `YieldPredictionSerializer` / `PricePredictionSerializer` validates crop, season, area, and location.
4. `Validation successful?` If no, return 400 field errors. If yes, call `ml_client.predict()`.
5. `ML service reachable within timeout?` If no, return 503. `Response valid JSON with prediction field?` If no, return 502. Otherwise return response to `AIPredictionPage`.
6. React stores `yieldResult` and `priceResult` and renders both values with the baseline disclaimer.

## 5. State Transition Diagram

The most meaningful object-level state model in NegiluAI is the order/payment lifecycle. To make the report complete, draw separate state-transition diagrams for the product listing, order, payment, and password reset code. Do not merge all four into one diagram; their state changes are independent.

### 5.1 Product listing state diagram (`Product.approval_status`)

| Current state | Event / guard | Next state | Action |
| --- | --- | --- | --- |
| `Not created` | Verified farmer submits valid product through `POST /products/` | `Pending review` | Create `Product`; server assigns farmer; default `approval_status = pending`. |
| `Pending review` | Administrator approves | `Approved` | Listing becomes visible to public consumers. |
| `Pending review` | Administrator rejects, optionally with moderation note | `Rejected` | Listing is withheld from public queries; farmer can see own listing and note. |
| `Rejected` | Administrator changes status to pending | `Pending review` | Listing enters moderation again. |
| `Rejected` | Administrator approves | `Approved` | Listing becomes publicly visible. |
| `Approved` | Administrator sets pending | `Pending review` | Listing is temporarily removed from ordinary public catalogue flow. |
| `Approved` | Administrator rejects | `Rejected` | Listing is removed from public catalogue flow and note may be retained. |
| Any non-deleted state | Owning farmer deletes listing | `Deleted` | Product and related dependent media/records follow model deletion rules. |

Draw a second availability marker attached to `Approved`: product can be `Available` while quantity is above zero, and becomes `Unavailable` when checkout reduces quantity to zero. When a cancelled, failed, or expired pending order releases stock, it returns to `Available`. Approval status and stock availability are separate attributes, so represent availability as a small parallel state or annotation rather than a replacement for approval state.

### 5.2 Order state diagram (`Order.status`)

| Current state | Trigger | Next state | Transition details |
| --- | --- | --- | --- |
| `No order` | Consumer completes valid checkout | `Pending` | Stock is reserved for 15 minutes; a payment record may then be created. |
| `Pending` | Razorpay signature verification succeeds or trusted webhook reports captured/paid | `Confirmed` | Payment becomes `paid`; order is paid and awaiting fulfilment. |
| `Pending` | Consumer cancels unpaid order | `Cancelled` | `release_order_stock` restores reserved stock once. |
| `Pending` | Payment verification fails or trusted webhook reports failure | `Cancelled` | Payment becomes `failed`; stock is released once. |
| `Pending` | Reservation expires and scheduled release runs | `Cancelled` | Expired stock reservation is released once. |
| `Confirmed` | Owning farmer submits `processing` | `Processing` | Allowed only if all items belong to that farmer. |
| `Processing` | Owning farmer submits `shipped` with courier and tracking ID | `Shipped` | `courier_name`, `tracking_id`, and `shipped_at` are stored. |
| `Shipped` | Owning farmer submits `delivered` | `Delivered` | `delivered_at` is stored; the consumer may now review purchased items. |
| `Delivered` | No normal transition | `Delivered` | Terminal successful state. |
| `Cancelled` | No normal transition | `Cancelled` | Terminal cancelled state. |

### 5.3 Payment state diagram (`Payment.status`)

| Current state | Event | Next state | Notes |
| --- | --- | --- | --- |
| `No payment record` | Consumer requests create-payment-order | `Created` | Django creates/reuses the Payment record and stores Razorpay order ID. |
| `Created` | Valid Razorpay signature or captured/paid webhook | `Paid` | Store Razorpay payment ID and paid timestamp; confirm order. |
| `Created` | Invalid signature or payment.failed webhook before payment | `Failed` | Mark payment failed and release stock reservation. |
| `Paid` | Duplicate verification/webhook | `Paid` | Remains paid; duplicate events do not create another state change. |
| `Failed` | No normal transition | `Failed` | Terminal failure state for that payment attempt. |

### 5.4 Password reset-code state diagram (`PasswordResetCode`)

| Current state | Event | Next state | Notes |
| --- | --- | --- | --- |
| `No active code` | Valid reset request for existing account | `Issued` | New hashed six-digit code is stored; it expires after 10 minutes. Earlier unused codes are consumed. |
| `Issued` | Incorrect code and attempts remain below five | `Issued` | Increment `attempts`; user can retry. |
| `Issued` | Correct code before expiry | `Verified` | Set `verified_at` and generate `reset_token`. |
| `Issued` | Five failed attempts or expiration | `Invalid/Expired` | Verification returns invalid/expired response. |
| `Verified` | Valid new password and reset token submitted before expiry | `Consumed` | Password is changed and `consumed_at` is set. |
| `Verified` | Expiration | `Invalid/Expired` | Password reset session cannot be used. |
| `Consumed` / `Invalid/Expired` | New reset request | `Issued` | A new independent code may be issued, subject to the five-per-hour request limit. |

## 6. System Flow Diagram

The system-flow diagram should be drawn as an end-to-end sequence across vertical swimlanes labelled `User`, `React Frontend`, `Django API`, `Database/Media`, `Razorpay`, and `FastAPI ML Service`. The standard consumer purchase flow below is the main diagram; place the farmer, admin, and prediction branches beside it as labelled alternatives.

### 6.1 Main end-to-end consumer purchase flow

1. **User lane:** Consumer opens NegiluAI and signs in.
2. **React Frontend lane:** `AuthPage` sends credentials through `api.login`; `AuthContext` retrieves the profile, persists JWT tokens/user data, and navigates the consumer to the appropriate workspace.
3. **Django API lane:** `LoginView` authenticates the user and returns access/refresh JWTs; `ProfileView` returns the profile. The JWT is checked on later protected requests.
4. **User lane:** Consumer opens the marketplace, searches or filters products, and views a product detail page.
5. **React Frontend lane:** `App.tsx` creates query parameters and calls `api.listProducts`; `ProductDetailPage` calls `api.productDetail` and optionally `api.reviews`.
6. **Django API lane:** `ProductViewSet.get_queryset()` returns only approved listings for consumers; Django filters by search/category/location/price/availability and serializes farmer, image, and rating information.
7. **Database/Media lane:** `Product`, `ProductImage`, and `Review` records are read; the resulting product data flows back through Django to React and is displayed to the consumer.
8. **User lane:** Consumer selects `Add to cart`.
9. **React Frontend lane:** `App.tsx::addToCart` calls `api.addCartItem`, then reloads the current cart and updates the cart drawer/count.
10. **Django API lane:** `CartItemViewSet.perform_create` verifies consumer role, prevents adding a self-owned product, and checks product approval, availability, and stock.
11. **Database lane:** `Cart` and `CartItem` are created or updated. The current cart returns to the UI.
12. **User lane:** Consumer opens `CartPage`, supplies the delivery address, and chooses checkout.
13. **React Frontend lane:** `api.checkout` sends the address to `/carts/checkout/`.
14. **Django API lane:** `CartViewSet.checkout` triggers expiry cleanup and calls transactional `checkout_cart`.
15. **Database lane:** The transaction locks product rows, validates each cart item, creates `Order` and `OrderItem` records, reduces product stock, sets a reservation expiry, calculates total amount, and clears cart items. The pending order returns to React.
16. **User/React lanes:** Consumer starts payment for the pending order. React requests a Razorpay payment order from Django and opens Razorpay checkout using the returned order ID/key/amount.
17. **Django API lane:** `create_razorpay_order` creates or reuses the `Payment` record and Razorpay order.
18. **Razorpay lane:** Razorpay processes the payment. It returns signed checkout details to the browser and sends a signed webhook to Django.
19. **Django API lane:** `verify_razorpay_payment` verifies the checkout signature; `razorpay_webhook` independently verifies the webhook signature and records the event once. On success, payment becomes `paid` and order becomes `confirmed`. On failure, payment becomes `failed`, the order becomes `cancelled`, and stock is restored once.
20. **Database lane:** `Payment`, `PaymentWebhookEvent`, `Order`, and product stock are updated.
21. **User lane:** Consumer views `ConsumerOrdersPage` to see confirmed, processing, shipped, or delivered status. After delivery, the consumer can submit one review per purchased product.
22. **Farmer branch:** `FarmerOrdersPage` retrieves only the farmer’s fulfilment items. The farmer changes a wholly owned order from confirmed to processing, then shipped (with courier/tracking data), then delivered. The final transition enables the review condition in `ProductViewSet.reviews`.

### 6.2 Farmer listing and moderation branch

1. Farmer signs in and opens `FarmerProductsPage`.
2. React sends product details and optional multipart image uploads using `api.createProduct` and `api.uploadProductImage`.
3. Django checks JWT, `IsFarmer`, and `IsVerifiedFarmer`; the product is saved with `approval_status = pending` and image records are linked to it.
4. Administrator opens `AdminProductsPage`, obtains pending listings through the admin dashboard/product endpoint, and selects approve, reject, or pending.
5. Django updates `Product.approval_status` and, on rejection, stores `moderation_note`.
6. Once approved, the listing appears in public consumer product queries. Dashboard summaries update automatically because they query the same stored records.

### 6.3 Crop-intelligence branch

1. An authenticated user opens `AIPredictionPage`, enters crop, location, season, area, and optional previous yield, then selects `Request prediction`.
2. React validates basic input and sends yield and price requests in parallel to Django; no browser-to-FastAPI arrow should be drawn.
3. Django validates each payload and `dashboard/ml_client.py` posts it to the configured `ML_SERVICE_URL`.
4. `ml-service/main.py` validates the FastAPI/Pydantic request and returns the baseline yield or price response with a disclaimer.
5. Django returns the validated response to React. If the service is unavailable or malformed, Django instead returns 503 or 502 and the page displays a user-facing error.
6. React displays the two results and labels them as baseline responses, not trained forecasts.

## 7. Diagram-drawing conventions

For consistency across the report, use a rectangle for a software module, a rounded rectangle for a process, a cylinder for a persistent data store, a stick-person or plain rectangle for an external actor, and a diamond for a decision. Label all data arrows with the data being transmitted rather than vague labels such as “data.” Use `Bearer JWT`, `product details`, `payment signature`, `approved listing`, or `baseline prediction response` as appropriate. Where the diagram refers to technology, use the exact project names: `App.tsx`, `AuthContext.tsx`, `api/client.ts`, `users`, `products`, `orders`, `dashboard`, `Razorpay`, and `ml-service/main.py`.
