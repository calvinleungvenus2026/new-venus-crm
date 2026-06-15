# Java Backend

This backend is a plain Java REST prototype so it can run without Maven in the current environment.

Endpoints:

- `POST /api/auth/login`
- `GET /api/companies`
- `GET /api/projects?companyId=<id>`
- `GET /api/drive/folder?companyId=<id>`
- `POST /api/project-rows/sync?companyId=<id>`

Run:

```bash
./run.sh
```

Per-company workbook source:

1. Copy `.env.example` to `.env.local`
2. Set one or more workbook paths in `.env.local`:
   `VENUS_CRM_XLSX_PATH`
   `TRINITY_PROPERTY_CRM_XLSX_PATH`
   `TRINITY_CONCIERGE_CRM_XLSX_PATH`
3. When a company workbook path is present, that company reads from its `.xlsx` file instead of Google Drive folders
4. Companies without a workbook path continue using the Google Drive fallback

Google Drive fallback setup:

1. Put your Google service account JSON somewhere local such as:
   `/Users/clavinleung/Desktop/venus-crm/secrets/google-drive-service-account.json`
2. Set `GOOGLE_SERVICE_ACCOUNT_JSON` in `.env.local` to that absolute path
3. Share the target Google Drive folders with the service account email

Supported company mappings:

- `venus` -> `GOOGLE_DRIVE_VENUS_FOLDER_ID`
- `trinity-property` -> `GOOGLE_DRIVE_TRINITY_PROPERTY_FOLDER_ID`
- `trinity-concierge` -> `GOOGLE_DRIVE_TRINITY_CONCIERGE_FOLDER_ID`

Example:

```bash
curl "http://localhost:8080/api/drive/folder?companyId=venus"
```

The next step can still be upgrading this to Spring Boot once Maven or Gradle is available.
