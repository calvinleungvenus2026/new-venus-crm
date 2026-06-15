# Venus CRM

This workspace now contains a fuller app scaffold modeled after the HR system architecture:

- `frontend-angular/` - Angular frontend
- `backend-java/` - Java REST backend prototype
- `docker-compose.yml` - MySQL container

## Frontend

```bash
cd frontend-angular
npm install
npm start
```

Angular dev server runs on `http://localhost:4200`.

## Backend

```bash
cd backend-java
./run.sh
```

Java backend runs on `http://localhost:8080` by default, but production should use a private port such as `127.0.0.1:8082`.

## Database

```bash
docker compose up -d mysql
```

MySQL container exposes host port `3309` by default in this repo.

## Current state

- Login supports the HR-style multi-company session shape.
- The top-left company switcher supports 7 companies.
- The Java backend currently serves seeded CRM/auth API data in memory so it can run without Maven.
- A MySQL schema file is included so we can wire persistence next.

# new-venus-crm
