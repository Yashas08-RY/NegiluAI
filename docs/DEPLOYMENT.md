# ನೇಗಿಲುai deployment and environment setup

## Backend environment

Copy `backend/.env.example` into an environment configuration that is never committed. In production set `DJANGO_ENV=production`, `DJANGO_DEBUG=False`, a long random `DJANGO_SECRET_KEY`, and the exact public hostnames in `DJANGO_ALLOWED_HOSTS`. Production enables HTTPS redirect, secure cookies, and HSTS by default; retain `DJANGO_SECURE_SSL=True` when your reverse proxy terminates TLS.

Set all five `POSTGRES_*` variables to use PostgreSQL. If any are absent, Django intentionally uses SQLite for local development and tests only. Install dependencies with `pip install -r requirements.txt`, then run `python manage.py migrate` and `python manage.py collectstatic --noinput`.

For HTTPS behind Render, Railway, or a reverse proxy, set `DJANGO_SECURE_SSL=True`; configure the proxy to send `X-Forwarded-Proto: https`. Set `CORS_ALLOWED_ORIGINS` to the exact deployed React origins, comma-separated. Cookies, HTTPS redirect, HSTS, framing, and referrer protections are enabled only as appropriate from these environment settings.

Set SMTP variables (`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL`) before enabling password-reset email. Configure Razorpay keys and `RAZORPAY_WEBHOOK_SECRET` in the host's secret manager, then point the Razorpay dashboard at `https://<backend-host>/api/orders/razorpay-webhook/`. Razorpay's signed webhook remains the payment authority; do not mark payments paid from a browser callback alone.

Demo payments are disabled by default. Set `ALLOW_DEMO_PAYMENTS=True` only for an isolated local demonstration; production must provide the Razorpay credentials instead. The API also applies anonymous and authenticated request throttles, so tune the DRF throttle rates if the deployment sits behind a shared proxy.

## Reservation cleanup schedule

Run `python manage.py release_expired_reservations` every five minutes. The command is idempotent and only returns stock from expired `pending` orders.

On Linux cron:

```cron
*/5 * * * * /path/to/venv/bin/python /path/to/backend/manage.py release_expired_reservations
```

On Windows Task Scheduler, create a task repeating every 5 minutes that runs `C:\path\to\venv\Scripts\python.exe C:\path\to\backend\manage.py release_expired_reservations`. On Render/Railway, use their cron-job service with the same command and the backend environment variables.
