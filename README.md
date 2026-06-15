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

Java backend runs on `http://localhost:8080`.

## Database

```bash
docker compose up -d mysql
```

MySQL listens on `127.0.0.1:3306`.

## Current state

- Login supports the HR-style multi-company session shape.
- The top-left company switcher supports 7 companies.
- The Java backend currently serves seeded CRM/auth API data in memory so it can run without Maven.
- A MySQL schema file is included so we can wire persistence next.

# new-venus-crm
