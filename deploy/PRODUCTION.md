# Production Deployment

This project is set up to run like the HR system:

- `nginx` serves the Angular frontend on public port `8082`
- `nginx` proxies `/api/*` to the Java backend on `127.0.0.1:8083`
- `docker compose` keeps MySQL running in background
- `systemd` keeps the Java backend running in background

## 1. Start MySQL

```bash
cd /path/to/venus-crm
docker compose up -d mysql
```

## 2. Prepare backend env

```bash
cp deploy/production.env.example deploy/production.env
```

Update `deploy/production.env` for your server.

Recommended production values:

```env
HOST=127.0.0.1
PORT=8083

MYSQL_BIN=/usr/bin/mysql
DB_HOST=127.0.0.1
DB_PORT=3309
DB_NAME=venus_crm
DB_USER=venus_app
DB_PASSWORD=venus_password
```

## 3. Build frontend

```bash
cd /path/to/venus-crm/frontend-angular
npm ci
npm run build
```

## 4. Install backend service

Copy `deploy/venus-crm-backend.service` to `/etc/systemd/system/venus-crm-backend.service`
and replace:

- `CHANGE_ME_USER`
- `CHANGE_ME_APP_ROOT`

Then run:

```bash
chmod +x /path/to/venus-crm/backend-java/run.sh
sudo cp deploy/venus-crm-backend.service /etc/systemd/system/venus-crm-backend.service
sudo systemctl daemon-reload
sudo systemctl enable venus-crm-backend
sudo systemctl start venus-crm-backend
sudo systemctl status venus-crm-backend
```

## 5. Install nginx site

Copy `deploy/venus-crm-nginx.conf` to your nginx config directory and replace:

- `CHANGE_ME_APP_ROOT`

Then run:

```bash
sudo nginx -t
sudo systemctl restart nginx
```

The app will be available at:

```bash
http://YOUR_SERVER_IP:8082
```

## Notes

- The frontend now uses same-origin `/api` requests, so nginx should be the public entry point.
- The checked-in production nginx template assumes backend `127.0.0.1:8083`.
- The backend reads config from environment variables:
  - `HOST`
  - `PORT`
  - `MYSQL_BIN`
  - `DB_HOST`
  - `DB_PORT`
  - `DB_NAME`
  - `DB_USER`
  - `DB_PASSWORD`
