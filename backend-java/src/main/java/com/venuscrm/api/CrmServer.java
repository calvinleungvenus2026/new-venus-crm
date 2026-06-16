package com.venuscrm.api;

import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.SecureRandom;
import java.security.PrivateKey;
import java.security.Signature;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.KeySpec;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.Statement;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

import javax.xml.parsers.DocumentBuilderFactory;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

public final class CrmServer {
    private static final int PORT = envInt("PORT", 8080);
    private static final String SERVER_HOST = env("HOST", "127.0.0.1");
    private static final String DB_HOST = env("DB_HOST", "127.0.0.1");
    private static final String DB_PORT = env("DB_PORT", "3309");
    private static final String DB_NAME = env("DB_NAME", "venus_crm");
    private static final String DB_USER = env("DB_USER", "venus_app");
    private static final String DB_PASSWORD = env("DB_PASSWORD", "venus_password");
    private static final String JDBC_URL = "jdbc:mysql://" + DB_HOST + ":" + DB_PORT + "/" + DB_NAME
        + "?allowMultiQueries=true&useUnicode=true&characterEncoding=UTF-8&serverTimezone=UTC";
    private static final HttpClient HTTP_CLIENT = HttpClient.newHttpClient();
    private static final Base64.Encoder BASE64_URL_ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Pattern JSON_STRING_PATTERN_TEMPLATE =
        Pattern.compile("\"%s\"\\s*:\\s*\"((?:\\\\.|[^\\\\\"])*)\"", Pattern.DOTALL);
    private static final String XLSX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final int SESSION_DURATION_DAYS = 30;
    private static final int PASSWORD_ITERATIONS = 65_536;
    private static final int PASSWORD_KEY_LENGTH = 256;
    private static final String DEFAULT_PASSWORD = "testtest123";
    private static final List<Company> SEED_COMPANIES = List.of(
        new Company("venus", "Venus London Technology Limited", "VL", "#4e8ef7"),
        new Company("trinity-property", "Trinity Property Consultancy Limited", "TP", "#14b8a6"),
        new Company("trinity-concierge", "Trinity London Concierge Limited", "TC", "#f97316"),
        new Company("ripplesoft", "Ripplesoft Limited", "RS", "#8b5cf6"),
        new Company("ripple-mic", "Ripple MIC Limited", "RM", "#ef4444"),
        new Company("luminarytech", "Luminarytech Limited", "LT", "#0ea5e9"),
        new Company("banyan-digital", "Banyan Digital Limited", "BD", "#22c55e"),
        new Company("momentum-growth", "Momentum Growth Agency Limited", "MG", "#f59e0b"),
        new Company("biocheck", "Biocheck Health Limited", "BH", "#10b981"),
        new Company("crestpoint-hr", "CrestpointHR", "CH", "#6366f1"),
        new Company("novasoft-tech", "NovaSoftTech", "NS", "#06b6d4")
    );
    private static final Map<String, String> LEGACY_SEED_EMAIL_MIGRATIONS = Map.of(
        "admin-crm@ripplesoft.co.uk", "admin-crm@ripplesoftlimited.co.uk",
        "admin-crm@ripplemic.co.uk", "admin-crm@ripplemiclimited.co.uk",
        "admin-crm@banyandigital.co.uk", "admin-crm@banyandigitallimited.co.uk"
    );
    private static final List<SeedAccount> SEED_ACCOUNTS = List.of(
        new SeedAccount("admin-crm@venuslondontechnology.co.uk", DEFAULT_PASSWORD, "Venus London Technology Admin", "COMPANY_ADMIN", List.of("venus")),
        new SeedAccount("admin-crm@propertytrinity.co.uk", DEFAULT_PASSWORD, "Trinity Property Consultancy Admin", "COMPANY_ADMIN", List.of("trinity-property")),
        new SeedAccount("admin-crm@trinityconcierge.co.uk", DEFAULT_PASSWORD, "Trinity London Concierge Admin", "COMPANY_ADMIN", List.of("trinity-concierge")),
        new SeedAccount("admin-crm@ripplesoftlimited.co.uk", DEFAULT_PASSWORD, "Ripplesoft Admin", "COMPANY_ADMIN", List.of("ripplesoft")),
        new SeedAccount("admin-crm@ripplemiclimited.co.uk", DEFAULT_PASSWORD, "Ripple MIC Admin", "COMPANY_ADMIN", List.of("ripple-mic")),
        new SeedAccount("admin-crm@luminarytech.co.uk", DEFAULT_PASSWORD, "Luminarytech Admin", "COMPANY_ADMIN", List.of("luminarytech")),
        new SeedAccount("admin-crm@banyandigitallimited.co.uk", DEFAULT_PASSWORD, "Banyan Digital Admin", "COMPANY_ADMIN", List.of("banyan-digital")),
        new SeedAccount("admin-crm@momentumgrowthagency.co.uk", DEFAULT_PASSWORD, "Momentum Growth Agency Admin", "COMPANY_ADMIN", List.of("momentum-growth")),
        new SeedAccount("admin-crm@biocheckhealth.co.uk", DEFAULT_PASSWORD, "Biocheck Health Admin", "COMPANY_ADMIN", List.of("biocheck")),
        new SeedAccount("admin-crm@crestpointhr.co.uk", DEFAULT_PASSWORD, "CrestpointHR Admin", "COMPANY_ADMIN", List.of("crestpoint-hr")),
        new SeedAccount("admin-crm@novasoft-technologies.co.uk", DEFAULT_PASSWORD, "NovaSoftTech Admin", "COMPANY_ADMIN", List.of("novasoft-tech")),
        new SeedAccount("admin-crm@universal.com", DEFAULT_PASSWORD, "Universal CRM Admin", "SUPER_ADMIN", List.of(
            "venus", "trinity-property", "trinity-concierge", "ripplesoft", "ripple-mic", "luminarytech", "banyan-digital", "momentum-growth",
            "biocheck", "crestpoint-hr", "novasoft-tech"
        ))
    );

    public static void main(String[] args) throws IOException {
        try {
            ensureDatabaseSchema();
        } catch (Exception error) {
            throw new IOException("Failed to initialize database schema: " + error.getMessage(), error);
        }
        HttpServer server = HttpServer.create(new InetSocketAddress(SERVER_HOST, PORT), 0);
        server.createContext("/api/auth/login", new LoginHandler());
        server.createContext("/api/auth/me", new AuthMeHandler());
        server.createContext("/api/auth/logout", new LogoutHandler());
        server.createContext("/api/auth/company", new SwitchCompanyHandler());
        server.createContext("/api/companies", new CompaniesHandler());
        server.createContext("/api/projects", new ProjectsHandler());
        server.createContext("/api/drive/folder", new DriveFolderHandler());
        server.createContext("/api/drive/sales-projects", new DriveSalesProjectsHandler());
        server.createContext("/api/project-rows", new ProjectRowsHandler());
        server.createContext("/api/project-rows/sync", new ProjectRowsSyncHandler());
        server.createContext("/api/project-rows/save", new ProjectRowsSaveHandler());
        server.createContext("/api/project-rows/delete", new ProjectRowsDeleteHandler());
        server.start();
        System.out.println("Venus CRM Java backend listening on http://" + SERVER_HOST + ":" + PORT);
    }

    private static final class LoginHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handlePreflight(exchange)) {
                return;
            }
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                respondJson(exchange, 405, "{\"error\":\"Method Not Allowed\"}");
                return;
            }

            String body = readBody(exchange.getRequestBody());
            String email = nullToEmpty(extractJsonString(body, "email")).toLowerCase();
            String password = nullToEmpty(extractJsonString(body, "password"));
            try {
                Account account = findAccount(email, password);
                if (account == null) {
                    respondJson(exchange, 401, "{\"error\":\"Unauthorized\"}");
                    return;
                }

                SessionRecord session = createSession(account);
                respondJson(exchange, 200, sessionJson(account, session));
            } catch (Exception error) {
                respondJson(exchange, 500, "{\"error\":\"Failed to load account\",\"details\":\"" + escape(error.getMessage()) + "\"}");
            }
        }
    }

    private static final class AuthMeHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handlePreflight(exchange)) {
                return;
            }
            if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                respondJson(exchange, 405, "{\"error\":\"Method Not Allowed\"}");
                return;
            }

            try {
                AuthenticatedSession auth = requireSession(exchange);
                respondJson(exchange, 200, sessionJson(auth.account(), auth.session()));
            } catch (UnauthorizedException error) {
                respondJson(exchange, 401, "{\"error\":\"Unauthorized\"}");
            } catch (Exception error) {
                respondJson(exchange, 500, "{\"error\":\"Failed to load session\",\"details\":\"" + escape(error.getMessage()) + "\"}");
            }
        }
    }

    private static final class LogoutHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handlePreflight(exchange)) {
                return;
            }
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                respondJson(exchange, 405, "{\"error\":\"Method Not Allowed\"}");
                return;
            }

            try {
                AuthenticatedSession auth = requireSession(exchange);
                runMysqlUpdate("DELETE FROM user_sessions WHERE token = '" + sqlEscape(auth.session().token()) + "';");
                respondJson(exchange, 200, "{\"ok\":true}");
            } catch (UnauthorizedException error) {
                respondJson(exchange, 401, "{\"error\":\"Unauthorized\"}");
            } catch (Exception error) {
                respondJson(exchange, 500, "{\"error\":\"Failed to logout\",\"details\":\"" + escape(error.getMessage()) + "\"}");
            }
        }
    }

    private static final class SwitchCompanyHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handlePreflight(exchange)) {
                return;
            }
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                respondJson(exchange, 405, "{\"error\":\"Method Not Allowed\"}");
                return;
            }

            try {
                AuthenticatedSession auth = requireSession(exchange);
                String body = readBody(exchange.getRequestBody());
                String companyId = nullToEmpty(extractJsonString(body, "companyId"));
                if (companyId.isBlank()) {
                    respondJson(exchange, 400, "{\"error\":\"Missing companyId\"}");
                    return;
                }
                ensureCompanyAccess(auth, companyId);
                runMysqlUpdate(
                    "UPDATE user_sessions SET current_company_id = '" + sqlEscape(companyId) + "' "
                        + "WHERE token = '" + sqlEscape(auth.session().token()) + "';"
                );
                SessionRecord updatedSession = new SessionRecord(
                    auth.session().token(),
                    auth.session().userId(),
                    companyId,
                    auth.session().expiresAt()
                );
                respondJson(exchange, 200, sessionJson(auth.account(), updatedSession));
            } catch (UnauthorizedException error) {
                respondJson(exchange, 401, "{\"error\":\"Unauthorized\"}");
            } catch (ForbiddenException error) {
                respondJson(exchange, 403, "{\"error\":\"Forbidden\"}");
            } catch (Exception error) {
                respondJson(exchange, 500, "{\"error\":\"Failed to switch company\",\"details\":\"" + escape(error.getMessage()) + "\"}");
            }
        }
    }

    private static final class CompaniesHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handlePreflight(exchange)) {
                return;
            }
            try {
                AuthenticatedSession auth = requireSession(exchange);
                respondJson(exchange, 200, companiesJson(loadAccessibleCompaniesForUser(auth.account().id(), auth.account().role())));
            } catch (UnauthorizedException error) {
                respondJson(exchange, 401, "{\"error\":\"Unauthorized\"}");
            } catch (Exception error) {
                respondJson(exchange, 500, "{\"error\":\"Failed to load companies\",\"details\":\"" + escape(error.getMessage()) + "\"}");
            }
        }
    }

    private static final class ProjectsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handlePreflight(exchange)) {
                return;
            }

            Map<String, String> queryParams = parseQuery(exchange.getRequestURI());
            String companyId = queryParams.getOrDefault("companyId", "venus");
            try {
                AuthenticatedSession auth = requireSession(exchange);
                ensureCompanyAccess(auth, companyId);
                respondJson(exchange, 200, loadProjectsFromDatabase(companyId));
            } catch (UnauthorizedException error) {
                respondJson(exchange, 401, "{\"error\":\"Unauthorized\"}");
            } catch (ForbiddenException error) {
                respondJson(exchange, 403, "{\"error\":\"Forbidden\"}");
            } catch (Exception error) {
                respondJson(exchange, 500, "{\"error\":\"Failed to load projects\",\"details\":\"" + escape(error.getMessage()) + "\"}");
            }
        }
    }

    private static final class DriveFolderHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handlePreflight(exchange)) {
                return;
            }
            if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                respondJson(exchange, 405, "{\"error\":\"Method Not Allowed\"}");
                return;
            }

            Map<String, String> queryParams = parseQuery(exchange.getRequestURI());
            String companyId = queryParams.get("companyId");

            if (companyId == null || companyId.isBlank()) {
                respondJson(exchange, 400, "{\"error\":\"Missing companyId\"}");
                return;
            }

            try {
                AuthenticatedSession auth = requireSession(exchange);
                ensureCompanyAccess(auth, companyId);
                AppConfig config = AppConfig.load();
                String driveWorkbookFileId = config.driveWorkbookFileIdForCompany(companyId);
                String driveWorkbookFileName = config.driveWorkbookFileNameForCompany(companyId);
                String folderId = config.folderIdForCompany(companyId);
                if (driveWorkbookFileId != null && !driveWorkbookFileId.isBlank()) {
                    ServiceAccountCredentials credentials = ServiceAccountCredentials.fromFile(config.serviceAccountJsonPath());
                    String accessToken = requestDriveAccessToken(credentials);
                    DriveEntry workbookEntry = fetchDriveFileById(accessToken, driveWorkbookFileId);
                    respondJson(exchange, 200, driveWorkbookListingJson(companyId, workbookEntry));
                    return;
                }
                if (driveWorkbookFileName != null && !driveWorkbookFileName.isBlank()) {
                    ServiceAccountCredentials credentials = ServiceAccountCredentials.fromFile(config.serviceAccountJsonPath());
                    String accessToken = requestDriveAccessToken(credentials);
                    DriveEntry workbookEntry = fetchDriveFileByName(accessToken, driveWorkbookFileName, folderId);
                    respondJson(exchange, 200, driveWorkbookListingJson(companyId, workbookEntry));
                    return;
                }
                String workbookPath = config.workbookPathForCompany(companyId);
                if (workbookPath != null && !workbookPath.isBlank()) {
                    respondJson(exchange, 200, workbookListingJson(workbookPath, companyId));
                    return;
                }

                if (folderId == null || folderId.isBlank()) {
                    respondJson(exchange, 404, "{\"error\":\"No Google Drive folder configured for companyId: " + escape(companyId) + "\"}");
                    return;
                }

                ServiceAccountCredentials credentials = ServiceAccountCredentials.fromFile(config.serviceAccountJsonPath());
                String accessToken = requestDriveAccessToken(credentials);
                String payload = fetchDriveFolderListing(accessToken, folderId, companyId);
                respondJson(exchange, 200, payload);
            } catch (ConfigurationException error) {
                respondJson(exchange, 500, "{\"error\":\"" + escape(error.getMessage()) + "\"}");
            } catch (UnauthorizedException error) {
                respondJson(exchange, 401, "{\"error\":\"Unauthorized\"}");
            } catch (ForbiddenException error) {
                respondJson(exchange, 403, "{\"error\":\"Forbidden\"}");
            } catch (Exception error) {
                respondJson(exchange, 502, "{\"error\":\"Google Drive request failed\",\"details\":\"" + escape(error.getMessage()) + "\"}");
            }
        }
    }

    private static final class DriveSalesProjectsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handlePreflight(exchange)) {
                return;
            }
            if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                respondJson(exchange, 405, "{\"error\":\"Method Not Allowed\"}");
                return;
            }

            Map<String, String> queryParams = parseQuery(exchange.getRequestURI());
            String companyId = queryParams.get("companyId");

            if (companyId == null || companyId.isBlank()) {
                respondJson(exchange, 400, "{\"error\":\"Missing companyId\"}");
                return;
            }

            try {
                AuthenticatedSession auth = requireSession(exchange);
                ensureCompanyAccess(auth, companyId);
                AppConfig config = AppConfig.load();
                String driveWorkbookFileId = config.driveWorkbookFileIdForCompany(companyId);
                String driveWorkbookFileName = config.driveWorkbookFileNameForCompany(companyId);
                String folderId = config.folderIdForCompany(companyId);
                if (driveWorkbookFileId != null && !driveWorkbookFileId.isBlank()) {
                    ServiceAccountCredentials credentials = ServiceAccountCredentials.fromFile(config.serviceAccountJsonPath());
                    String accessToken = requestDriveAccessToken(credentials);
                    List<ProjectRowRecord> rows = buildProjectRowsFromDriveFileId(accessToken, driveWorkbookFileId, companyId);
                    respondJson(exchange, 200, projectRowRecordsToJson(rows));
                    return;
                }
                if (driveWorkbookFileName != null && !driveWorkbookFileName.isBlank()) {
                    ServiceAccountCredentials credentials = ServiceAccountCredentials.fromFile(config.serviceAccountJsonPath());
                    String accessToken = requestDriveAccessToken(credentials);
                    List<ProjectRowRecord> rows = buildProjectRowsFromDriveWorkbook(accessToken, driveWorkbookFileName, companyId, folderId);
                    respondJson(exchange, 200, projectRowRecordsToJson(rows));
                    return;
                }
                String workbookPath = config.workbookPathForCompany(companyId);
                if (workbookPath != null && !workbookPath.isBlank()) {
                    List<ProjectRowRecord> rows = buildProjectRowsFromWorkbook(Path.of(workbookPath), companyId);
                    respondJson(exchange, 200, projectRowRecordsToJson(rows));
                    return;
                }
                if (folderId == null || folderId.isBlank()) {
                    respondJson(exchange, 404, "{\"error\":\"No Google Drive folder configured for companyId: " + escape(companyId) + "\"}");
                    return;
                }

                ServiceAccountCredentials credentials = ServiceAccountCredentials.fromFile(config.serviceAccountJsonPath());
                String accessToken = requestDriveAccessToken(credentials);
                Company company = findCompany(companyId);
                List<SalesProjectRow> rows = buildSalesProjectRows(accessToken, folderId, company == null ? companyId : company.name());
                respondJson(exchange, 200, salesRowsToJson(rows));
            } catch (ConfigurationException error) {
                respondJson(exchange, 500, "{\"error\":\"" + escape(error.getMessage()) + "\"}");
            } catch (UnauthorizedException error) {
                respondJson(exchange, 401, "{\"error\":\"Unauthorized\"}");
            } catch (ForbiddenException error) {
                respondJson(exchange, 403, "{\"error\":\"Forbidden\"}");
            } catch (Exception error) {
                respondJson(exchange, 502, "{\"error\":\"Google Drive sales mapping failed\",\"details\":\"" + escape(error.getMessage()) + "\"}");
            }
        }
    }

    private static final class ProjectRowsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handlePreflight(exchange)) {
                return;
            }
            if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                respondJson(exchange, 405, "{\"error\":\"Method Not Allowed\"}");
                return;
            }

            Map<String, String> queryParams = parseQuery(exchange.getRequestURI());
            String companyId = queryParams.get("companyId");
            if (companyId == null || companyId.isBlank()) {
                respondJson(exchange, 400, "{\"error\":\"Missing companyId\"}");
                return;
            }

            try {
                AuthenticatedSession auth = requireSession(exchange);
                ensureCompanyAccess(auth, companyId);
                respondJson(exchange, 200, loadProjectRowsFromDatabase(companyId));
            } catch (UnauthorizedException error) {
                respondJson(exchange, 401, "{\"error\":\"Unauthorized\"}");
            } catch (ForbiddenException error) {
                respondJson(exchange, 403, "{\"error\":\"Forbidden\"}");
            } catch (Exception error) {
                respondJson(exchange, 500, "{\"error\":\"Failed to load project rows\",\"details\":\"" + escape(error.getMessage()) + "\"}");
            }
        }
    }

    private static final class ProjectRowsSyncHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handlePreflight(exchange)) {
                return;
            }
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                respondJson(exchange, 405, "{\"error\":\"Method Not Allowed\"}");
                return;
            }

            Map<String, String> queryParams = parseQuery(exchange.getRequestURI());
            String companyId = queryParams.get("companyId");
            if (companyId == null || companyId.isBlank()) {
                respondJson(exchange, 400, "{\"error\":\"Missing companyId\"}");
                return;
            }

            try {
                AuthenticatedSession auth = requireSession(exchange);
                ensureCompanyAccess(auth, companyId);
                AppConfig config = AppConfig.load();
                List<ProjectRowRecord> rows;
                String driveWorkbookFileId = config.driveWorkbookFileIdForCompany(companyId);
                String driveWorkbookFileName = config.driveWorkbookFileNameForCompany(companyId);
                String folderId = config.folderIdForCompany(companyId);
                if (driveWorkbookFileId != null && !driveWorkbookFileId.isBlank()) {
                    ServiceAccountCredentials credentials = ServiceAccountCredentials.fromFile(config.serviceAccountJsonPath());
                    String accessToken = requestDriveAccessToken(credentials);
                    rows = buildProjectRowsFromDriveFileId(accessToken, driveWorkbookFileId, companyId);
                } else if (driveWorkbookFileName != null && !driveWorkbookFileName.isBlank()) {
                    ServiceAccountCredentials credentials = ServiceAccountCredentials.fromFile(config.serviceAccountJsonPath());
                    String accessToken = requestDriveAccessToken(credentials);
                    rows = buildProjectRowsFromDriveWorkbook(accessToken, driveWorkbookFileName, companyId, folderId);
                } else {
                    String workbookPath = config.workbookPathForCompany(companyId);
                    if (workbookPath != null && !workbookPath.isBlank()) {
                        rows = buildProjectRowsFromWorkbook(Path.of(workbookPath), companyId);
                    } else {
                        if (folderId == null || folderId.isBlank()) {
                            respondJson(exchange, 404, "{\"error\":\"No Google Drive folder configured for companyId: " + escape(companyId) + "\"}");
                            return;
                        }

                        ServiceAccountCredentials credentials = ServiceAccountCredentials.fromFile(config.serviceAccountJsonPath());
                        String accessToken = requestDriveAccessToken(credentials);
                        Company company = findCompany(companyId);
                        rows = toProjectRowRecords(
                            companyId,
                            buildSalesProjectRows(accessToken, folderId, company == null ? companyId : company.name())
                        );
                    }
                }
                syncProjectRowsToDatabase(companyId, rows);
                respondJson(exchange, 200, loadProjectRowsFromDatabase(companyId));
            } catch (UnauthorizedException error) {
                respondJson(exchange, 401, "{\"error\":\"Unauthorized\"}");
            } catch (ForbiddenException error) {
                respondJson(exchange, 403, "{\"error\":\"Forbidden\"}");
            } catch (Exception error) {
                respondJson(exchange, 500, "{\"error\":\"Failed to sync project rows\",\"details\":\"" + escape(error.getMessage()) + "\"}");
            }
        }
    }

    private static final class ProjectRowsSaveHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handlePreflight(exchange)) {
                return;
            }
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                respondJson(exchange, 405, "{\"error\":\"Method Not Allowed\"}");
                return;
            }

            try {
                AuthenticatedSession auth = requireSession(exchange);
                String body = readBody(exchange.getRequestBody());
                ProjectRowRecord record = parseProjectRowRecord(body);
                ensureProjectRowWriteAccess(auth, record);
                saveProjectRowToDatabase(record);
                respondJson(exchange, 200, "{\"ok\":true}");
            } catch (UnauthorizedException error) {
                respondJson(exchange, 401, "{\"error\":\"Unauthorized\"}");
            } catch (ForbiddenException error) {
                respondJson(exchange, 403, "{\"error\":\"Forbidden\"}");
            } catch (Exception error) {
                respondJson(exchange, 500, "{\"error\":\"Failed to save project row\",\"details\":\"" + escape(error.getMessage()) + "\"}");
            }
        }
    }

    private static final class ProjectRowsDeleteHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handlePreflight(exchange)) {
                return;
            }
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                respondJson(exchange, 405, "{\"error\":\"Method Not Allowed\"}");
                return;
            }

            try {
                AuthenticatedSession auth = requireSession(exchange);
                String body = readBody(exchange.getRequestBody());
                String id = extractJsonNumber(body, "id");
                if (id == null || id.isBlank()) {
                    respondJson(exchange, 400, "{\"error\":\"Missing id\"}");
                    return;
                }
                ensureProjectDeleteAccess(auth, parseLong(id));
                runMysqlUpdate("DELETE FROM crm_project_rows WHERE id = " + id);
                respondJson(exchange, 200, "{\"ok\":true}");
            } catch (UnauthorizedException error) {
                respondJson(exchange, 401, "{\"error\":\"Unauthorized\"}");
            } catch (ForbiddenException error) {
                respondJson(exchange, 403, "{\"error\":\"Forbidden\"}");
            } catch (Exception error) {
                respondJson(exchange, 500, "{\"error\":\"Failed to delete project row\",\"details\":\"" + escape(error.getMessage()) + "\"}");
            }
        }
    }

    private static String fetchDriveFolderListing(String accessToken, String folderId, String companyId)
        throws IOException, InterruptedException {
        return "{"
            + "\"companyId\":\"" + escape(companyId) + "\","
            + "\"folderId\":\"" + escape(folderId) + "\","
            + "\"drive\":{\"files\":" + driveEntriesToJson(fetchDriveEntries(accessToken, folderId)) + "}"
            + "}";
    }

    private static String workbookListingJson(String workbookPath, String companyId) throws IOException {
        Path path = Path.of(workbookPath);
        if (!Files.exists(path)) {
            throw new IOException("CRM framework workbook not found: " + workbookPath);
        }

        DriveEntry entry = new DriveEntry(
            path.toAbsolutePath().toString(),
            path.getFileName().toString(),
            XLSX_MIME_TYPE,
            "",
            "",
            String.valueOf(Files.getLastModifiedTime(path).toInstant()),
            String.valueOf(Files.size(path))
        );

        return "{"
            + "\"companyId\":\"" + escape(companyId) + "\","
            + "\"folderId\":\"crm-framework\","
            + "\"drive\":{\"files\":[" + entry.toJson() + "]}"
            + "}";
    }

    private static String driveWorkbookListingJson(String companyId, DriveEntry workbookEntry) {
        return "{"
            + "\"companyId\":\"" + escape(companyId) + "\","
            + "\"folderId\":\"crm-drive-workbook\","
            + "\"drive\":{\"files\":[" + workbookEntry.toJson() + "]}"
            + "}";
    }

    private static List<SalesProjectRow> buildSalesProjectRows(String accessToken, String companyFolderId, String companyName)
        throws IOException, InterruptedException {
        List<DriveEntry> rootEntries = fetchDriveEntries(accessToken, companyFolderId);
        DriveEntry salesFolder = null;

        for (DriveEntry entry : rootEntries) {
            if ("02_Sales".equals(entry.name()) && entry.isFolder()) {
                salesFolder = entry;
                break;
            }
        }

        if (salesFolder == null) {
            return List.of();
        }

        List<DriveEntry> customerFolders = fetchDriveEntries(accessToken, salesFolder.id());
        List<SalesProjectRow> rows = new ArrayList<>();
        int nextId = 1000;

        for (DriveEntry customerFolder : customerFolders) {
            if (!customerFolder.isFolder()) {
                continue;
            }

            List<DriveEntry> customerFiles = fetchDriveEntries(accessToken, customerFolder.id());
            List<DriveEntry> fileEntries = customerFiles.stream()
                .filter(entry -> !entry.isFolder())
                .toList();

            if (fileEntries.isEmpty()) {
                rows.add(new SalesProjectRow(
                    nextId,
                    "drive",
                    companyName,
                    customerFolder.name(),
                    ""
                ));
                nextId += 1;
                continue;
            }

            for (DriveEntry fileEntry : fileEntries) {
                rows.add(new SalesProjectRow(
                    nextId,
                    "drive",
                    companyName,
                    customerFolder.name(),
                    stripFileExtension(fileEntry.name())
                ));
                nextId += 1;
            }
        }

        return rows;
    }

    private static List<ProjectRowRecord> buildProjectRowsFromWorkbook(Path workbookPath, String companyId) throws Exception {
        WorkbookData workbook = loadWorkbook(workbookPath);
        Company company = findCompany(companyId);
        WorkbookSheet matchedSheet = findBestCompanySheet(workbook.sheets(), companyId, company);
        if (matchedSheet != null) {
            return extractProjectRowsFromSheet(companyId, matchedSheet, company, false);
        }

        List<ProjectRowRecord> filteredRows = new ArrayList<>();
        for (WorkbookSheet sheet : workbook.sheets()) {
            filteredRows.addAll(extractProjectRowsFromSheet(companyId, sheet, company, true));
        }
        if (!filteredRows.isEmpty()) {
            return filteredRows;
        }

        for (WorkbookSheet sheet : workbook.sheets()) {
            List<ProjectRowRecord> rows = extractProjectRowsFromSheet(companyId, sheet, company, false);
            if (!rows.isEmpty()) {
                return rows;
            }
        }

        return List.of();
    }

    private static List<ProjectRowRecord> buildProjectRowsFromDriveWorkbook(String accessToken, String fileName, String companyId, String folderId) throws Exception {
        DriveEntry workbookEntry = fetchDriveFileByName(accessToken, fileName, folderId);
        Path tempWorkbook = downloadDriveFileToTemp(accessToken, workbookEntry);
        try {
            return buildProjectRowsFromWorkbook(tempWorkbook, companyId);
        } finally {
            Files.deleteIfExists(tempWorkbook);
        }
    }

    private static List<ProjectRowRecord> buildProjectRowsFromDriveFileId(String accessToken, String fileId, String companyId) throws Exception {
        DriveEntry workbookEntry = fetchDriveFileById(accessToken, fileId);
        Path tempWorkbook = downloadDriveFileToTemp(accessToken, workbookEntry);
        try {
            return buildProjectRowsFromWorkbook(tempWorkbook, companyId);
        } finally {
            Files.deleteIfExists(tempWorkbook);
        }
    }

    private static WorkbookData loadWorkbook(Path workbookPath) throws Exception {
        if (!Files.exists(workbookPath)) {
            throw new IOException("CRM framework workbook not found: " + workbookPath);
        }

        try (ZipFile zipFile = new ZipFile(workbookPath.toFile())) {
            List<String> sharedStrings = readSharedStrings(zipFile);
            List<WorkbookSheetRef> sheetRefs = readWorkbookSheetRefs(zipFile);
            List<WorkbookSheet> sheets = new ArrayList<>();

            for (WorkbookSheetRef sheetRef : sheetRefs) {
                ZipEntry entry = zipFile.getEntry(sheetRef.entryPath());
                if (entry == null) {
                    continue;
                }
                sheets.add(new WorkbookSheet(sheetRef.name(), readWorksheetRows(zipFile, entry, sharedStrings)));
            }

            return new WorkbookData(sheets);
        }
    }

    private static List<String> readSharedStrings(ZipFile zipFile) throws Exception {
        ZipEntry entry = zipFile.getEntry("xl/sharedStrings.xml");
        if (entry == null) {
            return List.of();
        }

        Element root = readXml(zipFile, entry);
        NodeList nodes = root.getElementsByTagNameNS("*", "si");
        List<String> values = new ArrayList<>();
        for (int index = 0; index < nodes.getLength(); index += 1) {
            values.add(readSharedStringItem((Element) nodes.item(index)));
        }
        return values;
    }

    private static String readSharedStringItem(Element sharedStringElement) {
        NodeList textNodes = sharedStringElement.getElementsByTagNameNS("*", "t");
        StringBuilder builder = new StringBuilder();
        for (int index = 0; index < textNodes.getLength(); index += 1) {
            builder.append(textNodes.item(index).getTextContent());
        }
        return builder.toString().trim();
    }

    private static List<WorkbookSheetRef> readWorkbookSheetRefs(ZipFile zipFile) throws Exception {
        ZipEntry workbookEntry = zipFile.getEntry("xl/workbook.xml");
        ZipEntry relationshipsEntry = zipFile.getEntry("xl/_rels/workbook.xml.rels");
        if (workbookEntry == null || relationshipsEntry == null) {
            return List.of();
        }

        Element workbookRoot = readXml(zipFile, workbookEntry);
        Element relationshipsRoot = readXml(zipFile, relationshipsEntry);

        Map<String, String> targetsByRelationshipId = new HashMap<>();
        NodeList relationshipNodes = relationshipsRoot.getElementsByTagNameNS("*", "Relationship");
        for (int index = 0; index < relationshipNodes.getLength(); index += 1) {
            Element relationship = (Element) relationshipNodes.item(index);
            String id = relationship.getAttribute("Id");
            String target = relationship.getAttribute("Target");
            if (!id.isBlank() && !target.isBlank()) {
                targetsByRelationshipId.put(id, normalizeWorkbookEntryPath(target));
            }
        }

        List<WorkbookSheetRef> sheetRefs = new ArrayList<>();
        NodeList sheetNodes = workbookRoot.getElementsByTagNameNS("*", "sheet");
        for (int index = 0; index < sheetNodes.getLength(); index += 1) {
            Element sheet = (Element) sheetNodes.item(index);
            String name = sheet.getAttribute("name");
            String relationshipId = sheet.getAttribute("r:id");
            String entryPath = targetsByRelationshipId.get(relationshipId);
            if (!name.isBlank() && entryPath != null && !entryPath.isBlank()) {
                sheetRefs.add(new WorkbookSheetRef(name, entryPath));
            }
        }

        return sheetRefs;
    }

    private static String normalizeWorkbookEntryPath(String target) {
        String normalized = target.replace("\\", "/");
        if (normalized.startsWith("/")) {
            normalized = normalized.substring(1);
        }
        if (!normalized.startsWith("xl/")) {
            normalized = "xl/" + normalized;
        }
        return normalized;
    }

    private static List<List<String>> readWorksheetRows(ZipFile zipFile, ZipEntry entry, List<String> sharedStrings) throws Exception {
        Element root = readXml(zipFile, entry);
        NodeList rowNodes = root.getElementsByTagNameNS("*", "row");
        List<List<String>> rows = new ArrayList<>();

        for (int rowIndex = 0; rowIndex < rowNodes.getLength(); rowIndex += 1) {
            Element rowElement = (Element) rowNodes.item(rowIndex);
            NodeList childNodes = rowElement.getChildNodes();
            Map<Integer, String> valuesByColumn = new HashMap<>();
            int maxColumnIndex = -1;

            for (int childIndex = 0; childIndex < childNodes.getLength(); childIndex += 1) {
                Node node = childNodes.item(childIndex);
                if (!(node instanceof Element cellElement) || !"c".equals(cellElement.getLocalName())) {
                    continue;
                }

                int columnIndex = cellReferenceToColumnIndex(cellElement.getAttribute("r"));
                if (columnIndex < 0) {
                    continue;
                }

                valuesByColumn.put(columnIndex, readCellValue(cellElement, sharedStrings));
                maxColumnIndex = Math.max(maxColumnIndex, columnIndex);
            }

            if (maxColumnIndex < 0) {
                rows.add(List.of());
                continue;
            }

            List<String> row = new ArrayList<>();
            for (int columnIndex = 0; columnIndex <= maxColumnIndex; columnIndex += 1) {
                row.add(valuesByColumn.getOrDefault(columnIndex, "").trim());
            }
            rows.add(row);
        }

        return rows;
    }

    private static Element readXml(ZipFile zipFile, ZipEntry entry) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(true);
        try (InputStream inputStream = zipFile.getInputStream(entry)) {
            return factory.newDocumentBuilder().parse(inputStream).getDocumentElement();
        }
    }

    private static int cellReferenceToColumnIndex(String cellReference) {
        if (cellReference == null || cellReference.isBlank()) {
            return -1;
        }

        int index = 0;
        while (index < cellReference.length() && Character.isLetter(cellReference.charAt(index))) {
            index += 1;
        }
        if (index == 0) {
            return -1;
        }

        int column = 0;
        for (int charIndex = 0; charIndex < index; charIndex += 1) {
            column = (column * 26) + (Character.toUpperCase(cellReference.charAt(charIndex)) - 'A' + 1);
        }
        return column - 1;
    }

    private static String readCellValue(Element cellElement, List<String> sharedStrings) {
        String type = cellElement.getAttribute("t");
        if ("inlineStr".equals(type)) {
            return joinTextNodes(cellElement, "t");
        }

        String rawValue = childText(cellElement, "v");
        if (rawValue.isBlank()) {
            return "";
        }

        if ("s".equals(type)) {
            int sharedStringIndex = safeParseInt(rawValue, -1);
            if (sharedStringIndex >= 0 && sharedStringIndex < sharedStrings.size()) {
                return sharedStrings.get(sharedStringIndex);
            }
        }

        return rawValue.trim();
    }

    private static String childText(Element element, String tagName) {
        NodeList nodes = element.getElementsByTagNameNS("*", tagName);
        if (nodes.getLength() == 0) {
            return "";
        }
        return nodes.item(0).getTextContent().trim();
    }

    private static String joinTextNodes(Element element, String tagName) {
        NodeList nodes = element.getElementsByTagNameNS("*", tagName);
        StringBuilder builder = new StringBuilder();
        for (int index = 0; index < nodes.getLength(); index += 1) {
            builder.append(nodes.item(index).getTextContent());
        }
        return builder.toString().trim();
    }

    private static int safeParseInt(String value, int fallback) {
        try {
            return Integer.parseInt(value.trim());
        } catch (Exception error) {
            return fallback;
        }
    }

    private static WorkbookSheet findBestCompanySheet(List<WorkbookSheet> sheets, String companyId, Company company) {
        List<String> aliases = companyAliases(companyId, company);
        String bestAlias = "";
        WorkbookSheet bestSheet = null;
        int bestScore = 0;

        for (WorkbookSheet sheet : sheets) {
            String normalizedSheetName = normalizeHeader(sheet.name());
            for (String alias : aliases) {
                if (normalizedSheetName.equals(alias) && alias.length() > bestScore) {
                    bestScore = alias.length();
                    bestAlias = alias;
                    bestSheet = sheet;
                } else if ((normalizedSheetName.contains(alias) || alias.contains(normalizedSheetName)) && alias.length() > bestScore) {
                    bestScore = alias.length();
                    bestAlias = alias;
                    bestSheet = sheet;
                }
            }
        }

        return bestAlias.isBlank() ? null : bestSheet;
    }

    private static List<ProjectRowRecord> extractProjectRowsFromSheet(String companyId, WorkbookSheet sheet, Company company, boolean requireCompanyMatch) {
        HeaderMapping headerMapping = findHeaderMapping(sheet.rows());
        if (headerMapping == null) {
            return List.of();
        }

        List<ProjectRowRecord> rows = new ArrayList<>();
        List<String> companyAliases = companyAliases(companyId, company);

        for (int rowIndex = headerMapping.headerRowIndex() + 1; rowIndex < sheet.rows().size(); rowIndex += 1) {
            List<String> row = sheet.rows().get(rowIndex);
            if (isBlankRow(row)) {
                continue;
            }

            if (requireCompanyMatch) {
                String companyCell = headerMapping.value(row, "company");
                if (companyCell.isBlank() || !matchesCompanyAlias(companyCell, companyAliases)) {
                    continue;
                }
            }

            ProjectRowRecord record = new ProjectRowRecord(
                0L,
                companyId,
                "crm-framework",
                computeSourceKey(companyId, headerMapping.value(row, "clientCompany"), headerMapping.value(row, "quoNumber"), headerMapping.value(row, "msaNumber")),
                headerMapping.value(row, "clientCompany"),
                headerMapping.value(row, "quoNumber"),
                headerMapping.value(row, "quoStatus"),
                headerMapping.value(row, "msaNumber"),
                headerMapping.value(row, "msaStatus"),
                headerMapping.value(row, "date"),
                headerMapping.value(row, "amountGbp"),
                headerMapping.value(row, "relatedInvoice"),
                headerMapping.value(row, "deliverables"),
                headerMapping.value(row, "engagementType"),
                headerMapping.value(row, "startDate"),
                headerMapping.value(row, "deliveryDate"),
                headerMapping.value(row, "phase1Status"),
                headerMapping.value(row, "phase2Status"),
                headerMapping.value(row, "phase3Status"),
                headerMapping.value(row, "msaSigner"),
                headerMapping.value(row, "note"),
                headerMapping.value(row, "completionStatus"),
                ""
            );

            if (isBlankProjectRow(record)) {
                continue;
            }
            rows.add(record);
        }

        return rows;
    }

    private static HeaderMapping findHeaderMapping(List<List<String>> rows) {
        for (int rowIndex = 0; rowIndex < rows.size(); rowIndex += 1) {
            List<String> row = rows.get(rowIndex);
            if (row.isEmpty()) {
                continue;
            }

            Map<String, Integer> fieldIndexes = new HashMap<>();
            for (int columnIndex = 0; columnIndex < row.size(); columnIndex += 1) {
                String fieldName = identifyField(row.get(columnIndex));
                if (fieldName != null && !fieldIndexes.containsKey(fieldName)) {
                    fieldIndexes.put(fieldName, columnIndex);
                }
            }

            if (fieldIndexes.containsKey("clientCompany") && (fieldIndexes.containsKey("quoNumber") || fieldIndexes.containsKey("deliverables") || fieldIndexes.containsKey("amountGbp"))) {
                return new HeaderMapping(rowIndex, fieldIndexes);
            }
        }
        return null;
    }

    private static String identifyField(String headerValue) {
        String normalized = normalizeHeader(headerValue);
        if (normalized.isBlank()) {
            return null;
        }

        if (matchesHeader(normalized, "company", "company", "companyid", "主体", "公司", "所属公司")) return "company";
        if (matchesHeader(normalized, "clientCompany", "clientcompany", "client", "customer", "customercompany", "companyname", "客户公司", "客户名称")) return "clientCompany";
        if (matchesHeader(normalized, "quoNumber", "quonumber", "quo编号", "quotationnumber", "quotenumber", "quote", "quotation", "报价单号", "报价编号", "报价")) return "quoNumber";
        if (matchesHeader(normalized, "quoStatus", "quostatus", "quotationstatus", "quotestatus", "报价状态")) return "quoStatus";
        if (matchesHeader(normalized, "msaNumber", "msanumber", "msa", "msa编号", "msa单号")) return "msaNumber";
        if (matchesHeader(normalized, "msaStatus", "msastatus", "msa状态")) return "msaStatus";
        if (matchesHeader(normalized, "date", "date", "rowdate", "日期")) return "date";
        if (matchesHeader(normalized, "amountGbp", "amountgbp", "金额gbp", "gbpamount", "amount", "金额", "英镑金额")) return "amountGbp";
        if (matchesHeader(normalized, "relatedInvoice", "relatedinvoice", "invoice", "关联发票", "发票")) return "relatedInvoice";
        if (matchesHeader(normalized, "deliverables", "deliverables", "deliveryitems", "scope", "服务内容", "交付内容", "交付")) return "deliverables";
        if (matchesHeader(normalized, "engagementType", "engagementtype", "oneoffphasebased", "one-off/ phase-based", "one-off/phase-based", "oneoff/phasebased", "项目类型", "收费类型")) return "engagementType";
        if (matchesHeader(normalized, "startDate", "startdate", "开始日期")) return "startDate";
        if (matchesHeader(normalized, "deliveryDate", "deliverydate", "完成日期", "交付日期")) return "deliveryDate";
        if (matchesHeader(normalized, "phase1Status", "phase1status", "phase1完成状态", "phase1状态", "第一阶段完成状态", "阶段1完成状态", "phase 1 完成状态")) return "phase1Status";
        if (matchesHeader(normalized, "phase2Status", "phase2status", "phase2完成状态", "phase2状态", "第二阶段完成状态", "阶段2完成状态", "phase 2 完成状态")) return "phase2Status";
        if (matchesHeader(normalized, "phase3Status", "phase3status", "phase3完成状态", "phase3状态", "第三阶段完成状态", "阶段3完成状态", "phase 3 完成状态")) return "phase3Status";
        if (matchesHeader(normalized, "msaSigner", "msasigner", "followupowner", "跟进人（msa签署人）", "跟进人", "msa签署人")) return "msaSigner";
        if (matchesHeader(normalized, "note", "notes", "remark", "remarks", "备注")) return "note";
        if (matchesHeader(normalized, "completionStatus", "completionstatus", "status", "完成状态", "进度")) return "completionStatus";
        return null;
    }

    private static boolean matchesHeader(String normalized, String fieldKey, String... aliases) {
        if (normalized.equals(normalizeHeader(fieldKey))) {
            return true;
        }
        for (String alias : aliases) {
            if (normalized.equals(normalizeHeader(alias))) {
                return true;
            }
        }
        return false;
    }

    private static List<String> companyAliases(String companyId, Company company) {
        List<String> aliases = new ArrayList<>();
        aliases.add(normalizeHeader(companyId));
        if (company != null) {
            aliases.add(normalizeHeader(company.name()));
            aliases.add(normalizeHeader(company.shortName()));
        }

        switch (companyId) {
            case "venus" -> aliases.add(normalizeHeader("VenusLondonTech"));
            case "trinity-property" -> aliases.add(normalizeHeader("TrinityPropertyConsultancy"));
            case "trinity-concierge" -> aliases.add(normalizeHeader("TrinityLondonConcierge"));
            case "ripplesoft" -> aliases.add(normalizeHeader("RippleSoft"));
            case "ripple-mic" -> aliases.add(normalizeHeader("RippleMIC"));
            case "luminarytech" -> aliases.add(normalizeHeader("LuminaryTech"));
            case "banyan-digital" -> aliases.add(normalizeHeader("BanyanDigital"));
            case "momentum-growth" -> aliases.add(normalizeHeader("MomentumGrowth"));
            case "biocheck" -> aliases.add(normalizeHeader("Biocheck"));
            case "crestpoint-hr" -> aliases.add(normalizeHeader("CrestpointHR"));
            case "novasoft-tech" -> aliases.add(normalizeHeader("NovaSoftTech"));
            default -> {
            }
        }

        return aliases.stream().filter(alias -> !alias.isBlank()).distinct().toList();
    }

    private static boolean matchesCompanyAlias(String rawValue, List<String> aliases) {
        String normalized = normalizeHeader(rawValue);
        for (String alias : aliases) {
            if (normalized.equals(alias) || normalized.contains(alias) || alias.contains(normalized)) {
                return true;
            }
        }
        return false;
    }

    private static boolean isBlankRow(List<String> row) {
        for (String value : row) {
            if (value != null && !value.isBlank()) {
                return false;
            }
        }
        return true;
    }

    private static boolean isBlankProjectRow(ProjectRowRecord row) {
        return row.clientCompany().isBlank()
            && row.quoNumber().isBlank()
            && row.quoStatus().isBlank()
            && row.msaNumber().isBlank()
            && row.msaStatus().isBlank()
            && row.date().isBlank()
            && row.amountGbp().isBlank()
            && row.relatedInvoice().isBlank()
            && row.deliverables().isBlank()
            && row.engagementType().isBlank()
            && row.startDate().isBlank()
            && row.deliveryDate().isBlank()
            && row.phase1Status().isBlank()
            && row.phase2Status().isBlank()
            && row.phase3Status().isBlank()
            && row.msaSigner().isBlank()
            && row.completionStatus().isBlank();
    }

    private static String normalizeHeader(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }

        StringBuilder builder = new StringBuilder();
        for (int index = 0; index < value.length(); index += 1) {
            char current = value.charAt(index);
            if (Character.isLetterOrDigit(current)) {
                builder.append(Character.toLowerCase(current));
            }
        }
        return builder.toString();
    }

    private static List<DriveEntry> fetchDriveEntries(String accessToken, String folderId)
        throws IOException, InterruptedException {
        String query = "'" + folderId + "' in parents and trashed = false";
        String url = "https://www.googleapis.com/drive/v3/files"
            + "?q=" + URLEncoder.encode(query, StandardCharsets.UTF_8)
            + "&fields=" + URLEncoder.encode("files(id,name,mimeType,webViewLink,webContentLink,modifiedTime,size)", StandardCharsets.UTF_8)
            + "&supportsAllDrives=true"
            + "&includeItemsFromAllDrives=true"
            + "&orderBy=" + URLEncoder.encode("folder,name", StandardCharsets.UTF_8);

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .header("Authorization", "Bearer " + accessToken)
            .header("Accept", "application/json")
            .GET()
            .build();

        HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() >= 400) {
            throw new IOException("Drive API returned " + response.statusCode() + ": " + response.body());
        }

        return parseDriveEntries(response.body());
    }

    private static DriveEntry fetchDriveFileByExactName(String accessToken, String fileName)
        throws IOException, InterruptedException {
        String query = "name = '" + escapeDriveQueryLiteral(fileName) + "' and trashed = false";
        String url = "https://www.googleapis.com/drive/v3/files"
            + "?q=" + URLEncoder.encode(query, StandardCharsets.UTF_8)
            + "&fields=" + URLEncoder.encode("files(id,name,mimeType,webViewLink,webContentLink,modifiedTime,size)", StandardCharsets.UTF_8)
            + "&supportsAllDrives=true"
            + "&includeItemsFromAllDrives=true"
            + "&orderBy=" + URLEncoder.encode("modifiedTime desc,name", StandardCharsets.UTF_8);

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .header("Authorization", "Bearer " + accessToken)
            .header("Accept", "application/json")
            .GET()
            .build();

        HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() >= 400) {
            throw new IOException("Drive API returned " + response.statusCode() + ": " + response.body());
        }

        List<DriveEntry> entries = parseDriveEntries(response.body());
        for (DriveEntry entry : entries) {
            if (fileName.equals(entry.name())) {
                return entry;
            }
        }
        throw new IOException("Google Drive file not found: " + fileName);
    }

    private static DriveEntry fetchDriveFileByName(String accessToken, String fileName, String folderId)
        throws IOException, InterruptedException {
        if (folderId != null && !folderId.isBlank()) {
            List<DriveEntry> entries = fetchDriveEntries(accessToken, folderId);
            DriveEntry match = findDriveEntryByConfiguredName(entries, fileName);
            if (match != null) {
                return match;
            }
        }

        return fetchDriveFileByExactName(accessToken, fileName);
    }

    private static DriveEntry fetchDriveFileById(String accessToken, String fileId)
        throws IOException, InterruptedException {
        String url = "https://www.googleapis.com/drive/v3/files/" + URLEncoder.encode(fileId, StandardCharsets.UTF_8)
            + "?fields=" + URLEncoder.encode("id,name,mimeType,webViewLink,webContentLink,modifiedTime,size", StandardCharsets.UTF_8)
            + "&supportsAllDrives=true";

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .header("Authorization", "Bearer " + accessToken)
            .header("Accept", "application/json")
            .GET()
            .build();

        HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() >= 400) {
            throw new IOException("Drive API returned " + response.statusCode() + ": " + response.body());
        }

        String body = response.body();
        String id = extractJsonString(body, "id");
        String name = extractJsonString(body, "name");
        String mimeType = extractJsonString(body, "mimeType");
        if (id == null || name == null || mimeType == null) {
            throw new IOException("Google Drive file metadata missing for fileId: " + fileId);
        }

        return new DriveEntry(
            id,
            name,
            mimeType,
            extractJsonString(body, "webViewLink"),
            extractJsonString(body, "webContentLink"),
            extractJsonString(body, "modifiedTime"),
            extractJsonString(body, "size")
        );
    }

    private static Path downloadDriveFileToTemp(String accessToken, DriveEntry entry)
        throws IOException, InterruptedException {
        String url;
        if ("application/vnd.google-apps.spreadsheet".equals(entry.mimeType())) {
            url = "https://www.googleapis.com/drive/v3/files/" + URLEncoder.encode(entry.id(), StandardCharsets.UTF_8)
                + "/export?mimeType=" + URLEncoder.encode(XLSX_MIME_TYPE, StandardCharsets.UTF_8);
        } else {
            url = "https://www.googleapis.com/drive/v3/files/" + URLEncoder.encode(entry.id(), StandardCharsets.UTF_8)
                + "?alt=media&supportsAllDrives=true";
        }

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .header("Authorization", "Bearer " + accessToken)
            .GET()
            .build();

        HttpResponse<byte[]> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofByteArray());
        if (response.statusCode() >= 400) {
            throw new IOException("Drive file download failed with " + response.statusCode());
        }

        Path tempFile = Files.createTempFile("venus-crm-drive-workbook-", ".xlsx");
        Files.write(tempFile, response.body());
        return tempFile;
    }

    private static DriveEntry findDriveEntryByConfiguredName(List<DriveEntry> entries, String configuredName) {
        for (DriveEntry entry : entries) {
            if (configuredName.equals(entry.name())) {
                return entry;
            }
        }

        String normalizedConfigured = normalizeDriveWorkbookName(configuredName);
        for (DriveEntry entry : entries) {
            if (normalizedConfigured.equals(normalizeDriveWorkbookName(entry.name()))) {
                return entry;
            }
        }

        return null;
    }

    private static String normalizeDriveWorkbookName(String value) {
        String normalized = value == null ? "" : value.trim().toLowerCase();
        if (normalized.endsWith(".xlsx")) {
            normalized = normalized.substring(0, normalized.length() - 5);
        }
        return normalized.replace(" ", "");
    }

    private static String escapeDriveQueryLiteral(String value) {
        return value.replace("\\", "\\\\").replace("'", "\\'");
    }

    private static List<DriveEntry> parseDriveEntries(String json) {
        int listStart = json.indexOf('[');
        int listEnd = json.lastIndexOf(']');
        if (listStart < 0 || listEnd < listStart) {
            return List.of();
        }

        String arrayContent = json.substring(listStart + 1, listEnd);
        List<String> objectJsons = splitTopLevelObjects(arrayContent);
        List<DriveEntry> entries = new ArrayList<>();

        for (String objectJson : objectJsons) {
            String id = extractJsonString(objectJson, "id");
            String name = extractJsonString(objectJson, "name");
            String mimeType = extractJsonString(objectJson, "mimeType");

            if (id == null || name == null || mimeType == null) {
                continue;
            }

            entries.add(new DriveEntry(
                id,
                name,
                mimeType,
                extractJsonString(objectJson, "webViewLink"),
                extractJsonString(objectJson, "webContentLink"),
                extractJsonString(objectJson, "modifiedTime"),
                extractJsonString(objectJson, "size")
            ));
        }

        return entries;
    }

    private static List<String> splitTopLevelObjects(String raw) {
        List<String> objects = new ArrayList<>();
        int depth = 0;
        boolean inString = false;
        boolean escaping = false;
        int start = -1;

        for (int index = 0; index < raw.length(); index += 1) {
            char current = raw.charAt(index);
            if (inString) {
                if (escaping) {
                    escaping = false;
                } else if (current == '\\') {
                    escaping = true;
                } else if (current == '"') {
                    inString = false;
                }
                continue;
            }

            if (current == '"') {
                inString = true;
                continue;
            }

            if (current == '{') {
                if (depth == 0) {
                    start = index;
                }
                depth += 1;
            } else if (current == '}') {
                depth -= 1;
                if (depth == 0 && start >= 0) {
                    objects.add(raw.substring(start, index + 1));
                    start = -1;
                }
            }
        }

        return objects;
    }

    private static String requestDriveAccessToken(ServiceAccountCredentials credentials)
        throws Exception {
        long now = Instant.now().getEpochSecond();
        String headerJson = "{\"alg\":\"RS256\",\"typ\":\"JWT\"}";
        String claimSetJson = "{"
            + "\"iss\":\"" + escape(credentials.clientEmail) + "\","
            + "\"scope\":\"https://www.googleapis.com/auth/drive.readonly\","
            + "\"aud\":\"https://oauth2.googleapis.com/token\","
            + "\"iat\":" + now + ","
            + "\"exp\":" + (now + 3600)
            + "}";

        String encodedHeader = BASE64_URL_ENCODER.encodeToString(headerJson.getBytes(StandardCharsets.UTF_8));
        String encodedClaims = BASE64_URL_ENCODER.encodeToString(claimSetJson.getBytes(StandardCharsets.UTF_8));
        String unsignedJwt = encodedHeader + "." + encodedClaims;
        String signedJwt = unsignedJwt + "." + signJwt(unsignedJwt, credentials.privateKey);

        String formBody = "grant_type=" + URLEncoder.encode("urn:ietf:params:oauth:grant-type:jwt-bearer", StandardCharsets.UTF_8)
            + "&assertion=" + URLEncoder.encode(signedJwt, StandardCharsets.UTF_8);

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(credentials.tokenUri))
            .header("Content-Type", "application/x-www-form-urlencoded")
            .POST(HttpRequest.BodyPublishers.ofString(formBody, StandardCharsets.UTF_8))
            .build();

        HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() >= 400) {
            throw new IOException("Token endpoint returned " + response.statusCode() + ": " + response.body());
        }

        String accessToken = extractJsonString(response.body(), "access_token");
        if (accessToken == null || accessToken.isBlank()) {
            throw new IOException("No access_token returned by Google OAuth token endpoint");
        }
        return accessToken;
    }

    private static String signJwt(String unsignedJwt, PrivateKey privateKey) throws Exception {
        Signature signature = Signature.getInstance("SHA256withRSA");
        signature.initSign(privateKey);
        signature.update(unsignedJwt.getBytes(StandardCharsets.UTF_8));
        return BASE64_URL_ENCODER.encodeToString(signature.sign());
    }

    private static boolean handlePreflight(HttpExchange exchange) throws IOException {
        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            respondJson(exchange, 204, "");
            return true;
        }
        return false;
    }

    private static String companiesJson() throws Exception {
        return "[" + loadCompaniesFromDatabase().stream().map(Company::toJson).reduce((a, b) -> a + "," + b).orElse("") + "]";
    }

    private static String companiesJson(List<Company> companies) {
        return "[" + companies.stream().map(Company::toJson).reduce((a, b) -> a + "," + b).orElse("") + "]";
    }

    private static String sessionJson(Account account, SessionRecord session) throws Exception {
        List<Company> accessibleCompanies = loadAccessibleCompaniesForUser(account.id(), account.role());
        if (accessibleCompanies.isEmpty()) {
            throw new IOException("No companies assigned for user " + account.email());
        }
        Company defaultCompany = accessibleCompanies.stream()
            .filter(company -> company.id().equals(session.currentCompanyId()))
            .findFirst()
            .orElse(accessibleCompanies.getFirst());

        return "{"
            + "\"token\":\"" + escape(session.token()) + "\","
            + "\"email\":\"" + escape(account.email()) + "\","
            + "\"name\":\"" + escape(account.name()) + "\","
            + "\"role\":\"" + escape(account.role()) + "\","
            + "\"company\":" + defaultCompany.toJson() + ","
            + "\"companies\":" + companiesJson(accessibleCompanies)
            + "}";
    }

    private static AuthenticatedSession requireSession(HttpExchange exchange) throws Exception {
        String authorization = exchange.getRequestHeaders().getFirst("Authorization");
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new UnauthorizedException();
        }
        String token = authorization.substring("Bearer ".length()).trim();
        if (token.isBlank()) {
            throw new UnauthorizedException();
        }

        String sql = "SELECT s.token, s.user_id, s.current_company_id, u.email, u.password, u.name, u.role "
            + "FROM user_sessions s "
            + "JOIN users u ON u.id = s.user_id "
            + "WHERE s.token = '" + sqlEscape(token) + "' AND s.expires_at > NOW() "
            + "LIMIT 1;";
        String output = runMysqlQuery(sql);
        if (output.isBlank()) {
            throw new UnauthorizedException();
        }

        String[] parts = output.split("\n")[0].split("\t", -1);
        if (parts.length < 7) {
            throw new UnauthorizedException();
        }

        runMysqlUpdate("UPDATE user_sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE token = '" + sqlEscape(token) + "';");
        return new AuthenticatedSession(
            new Account(parseLong(parts[1]), parts[3], parts[4], parts[5], parts[6]),
            new SessionRecord(parts[0], parseLong(parts[1]), parts[2], "")
        );
    }

    private static SessionRecord createSession(Account account) throws Exception {
        List<Company> accessibleCompanies = loadAccessibleCompaniesForUser(account.id(), account.role());
        if (accessibleCompanies.isEmpty()) {
            throw new IOException("No companies assigned for user " + account.email());
        }

        String token = UUID.randomUUID().toString() + UUID.randomUUID().toString().replace("-", "");
        String companyId = accessibleCompanies.getFirst().id();
        runMysqlUpdate(
            "INSERT INTO user_sessions (token, user_id, current_company_id, expires_at) VALUES ("
                + "'" + sqlEscape(token) + "',"
                + account.id() + ","
                + "'" + sqlEscape(companyId) + "',"
                + "DATE_ADD(NOW(), INTERVAL " + SESSION_DURATION_DAYS + " DAY)"
                + ");"
        );
        return new SessionRecord(token, account.id(), companyId, "");
    }

    private static void ensureCompanyAccess(AuthenticatedSession auth, String companyId) throws Exception {
        if (companyId == null || companyId.isBlank()) {
            throw new ForbiddenException();
        }
        if ("SUPER_ADMIN".equals(auth.account().role())) {
            return;
        }
        for (Company company : loadAccessibleCompaniesForUser(auth.account().id(), auth.account().role())) {
            if (company.id().equals(companyId)) {
                return;
            }
        }
        throw new ForbiddenException();
    }

    private static void ensureProjectRowWriteAccess(AuthenticatedSession auth, ProjectRowRecord record) throws Exception {
        if (record.id() > 0) {
            String output = runMysqlQuery("SELECT company_id FROM crm_project_rows WHERE id = " + record.id() + " LIMIT 1;");
            if (output.isBlank()) {
                throw new ForbiddenException();
            }
            ensureCompanyAccess(auth, output.split("\n")[0].trim());
            return;
        }
        ensureCompanyAccess(auth, record.companyId());
    }

    private static void ensureProjectDeleteAccess(AuthenticatedSession auth, long projectId) throws Exception {
        String output = runMysqlQuery("SELECT company_id FROM crm_project_rows WHERE id = " + projectId + " LIMIT 1;");
        if (output.isBlank()) {
            throw new ForbiddenException();
        }
        ensureCompanyAccess(auth, output.split("\n")[0].trim());
    }

    private static String rowsToJson(List<ProjectRow> rows) {
        return "[" + rows.stream().map(ProjectRow::toJson).reduce((a, b) -> a + "," + b).orElse("") + "]";
    }

    private static String salesRowsToJson(List<SalesProjectRow> rows) {
        return "[" + rows.stream().map(SalesProjectRow::toJson).reduce((a, b) -> a + "," + b).orElse("") + "]";
    }

    private static String driveEntriesToJson(List<DriveEntry> entries) {
        return "[" + entries.stream().map(DriveEntry::toJson).reduce((a, b) -> a + "," + b).orElse("") + "]";
    }

    private static void ensureDatabaseSchema() throws Exception {
        String sql = Files.readString(Path.of("src/main/resources/db/schema.sql"), StandardCharsets.UTF_8);
        runMysqlUpdate(sql);
        ensureSeedCompanies();
        ensureCrmProjectRowsSourceKeyColumn();
        ensureCrmProjectRowsPhaseStatusColumns();
        ensureCompaniesSortOrderColumn();
        ensureUsersSecurityColumns();
        seedAuthData();
    }

    private static void ensureSeedCompanies() throws Exception {
        for (Company company : SEED_COMPANIES) {
            runMysqlUpdate(
                "INSERT INTO companies (id, name, short_name, color) VALUES ("
                    + "'" + sqlEscape(company.id()) + "',"
                    + "'" + sqlEscape(company.name()) + "',"
                    + "'" + sqlEscape(company.shortName()) + "',"
                    + "'" + sqlEscape(company.color()) + "'"
                    + ") ON DUPLICATE KEY UPDATE "
                    + "name = VALUES(name), "
                    + "short_name = VALUES(short_name), "
                    + "color = VALUES(color);"
            );
        }
    }

    private static void ensureCrmProjectRowsSourceKeyColumn() throws Exception {
        String output = runMysqlQuery("SHOW COLUMNS FROM crm_project_rows LIKE 'source_key';");
        if (!output.isBlank()) {
            return;
        }
        runMysqlUpdate("ALTER TABLE crm_project_rows ADD COLUMN source_key VARCHAR(255) NOT NULL DEFAULT '' AFTER source;");
    }

    private static void ensureCrmProjectRowsPhaseStatusColumns() throws Exception {
        ensureCrmProjectRowsColumn("engagement_type", "VARCHAR(64) NOT NULL DEFAULT ''", "AFTER deliverables");
        ensureCrmProjectRowsColumn("phase_1_status", "VARCHAR(64) NOT NULL DEFAULT ''", "AFTER delivery_date");
        ensureCrmProjectRowsColumn("phase_2_status", "VARCHAR(64) NOT NULL DEFAULT ''", "AFTER phase_1_status");
        ensureCrmProjectRowsColumn("phase_3_status", "VARCHAR(64) NOT NULL DEFAULT ''", "AFTER phase_2_status");
        ensureCrmProjectRowsColumn("msa_signer", "VARCHAR(255) NOT NULL DEFAULT ''", "AFTER phase_3_status");
        ensureCrmProjectRowsColumn("note", "TEXT NOT NULL", "AFTER msa_signer");
        ensureCrmProjectRowsColumn("cell_style_json", "TEXT NOT NULL", "AFTER note");
    }

    private static void ensureCrmProjectRowsColumn(String columnName, String definition, String positionClause) throws Exception {
        String output = runMysqlQuery("SHOW COLUMNS FROM crm_project_rows LIKE '" + sqlEscape(columnName) + "';");
        if (!output.isBlank()) {
            return;
        }
        runMysqlUpdate("ALTER TABLE crm_project_rows ADD COLUMN " + columnName + " " + definition + " " + positionClause + ";");
    }

    private static void ensureCompaniesSortOrderColumn() throws Exception {
        String output = runMysqlQuery("SHOW COLUMNS FROM companies LIKE 'sort_order';");
        if (output.isBlank()) {
            runMysqlUpdate("ALTER TABLE companies ADD COLUMN sort_order INT NOT NULL DEFAULT 0 AFTER color;");
        }
        runMysqlUpdate("""
            UPDATE companies
            SET sort_order = CASE id
                WHEN 'venus' THEN 1
                WHEN 'trinity-property' THEN 2
                WHEN 'trinity-concierge' THEN 3
                WHEN 'ripplesoft' THEN 4
                WHEN 'ripple-mic' THEN 5
                WHEN 'luminarytech' THEN 6
                WHEN 'banyan-digital' THEN 7
                WHEN 'momentum-growth' THEN 8
                WHEN 'biocheck' THEN 9
                WHEN 'crestpoint-hr' THEN 10
                WHEN 'novasoft-tech' THEN 11
                ELSE 999
            END;
            """);
    }

    private static void ensureUsersSecurityColumns() throws Exception {
        ensureUsersColumn("password_hash", "VARCHAR(255) NOT NULL DEFAULT ''", "AFTER password");
        ensureUsersColumn("password_salt", "VARCHAR(255) NOT NULL DEFAULT ''", "AFTER password_hash");
        String sessions = runMysqlQuery("SHOW TABLES LIKE 'user_sessions';");
        if (sessions.isBlank()) {
            runMysqlUpdate("""
                CREATE TABLE user_sessions (
                  token VARCHAR(128) PRIMARY KEY,
                  user_id BIGINT NOT NULL,
                  current_company_id VARCHAR(64) NOT NULL,
                  expires_at TIMESTAMP NOT NULL,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                  CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                  CONSTRAINT fk_user_sessions_company FOREIGN KEY (current_company_id) REFERENCES companies(id) ON DELETE CASCADE
                );
                """);
        }
        String userCompanies = runMysqlQuery("SHOW TABLES LIKE 'user_companies';");
        if (userCompanies.isBlank()) {
            runMysqlUpdate("""
                CREATE TABLE user_companies (
                  user_id BIGINT NOT NULL,
                  company_id VARCHAR(64) NOT NULL,
                  PRIMARY KEY (user_id, company_id),
                  CONSTRAINT fk_user_companies_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                  CONSTRAINT fk_user_companies_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
                );
                """);
        }
    }

    private static void ensureUsersColumn(String columnName, String definition, String positionClause) throws Exception {
        String output = runMysqlQuery("SHOW COLUMNS FROM users LIKE '" + sqlEscape(columnName) + "';");
        if (!output.isBlank()) {
            return;
        }
        runMysqlUpdate("ALTER TABLE users ADD COLUMN " + columnName + " " + definition + " " + positionClause + ";");
    }

    private static void seedAuthData() throws Exception {
        migrateLegacySeedEmails();
        for (SeedAccount account : SEED_ACCOUNTS) {
            upsertSeedAccount(account);
        }
    }

    private static void migrateLegacySeedEmails() throws Exception {
        for (Map.Entry<String, String> migration : LEGACY_SEED_EMAIL_MIGRATIONS.entrySet()) {
            String legacyEmail = migration.getKey();
            String targetEmail = migration.getValue();
            String targetExists = runMysqlQuery(
                "SELECT id FROM users WHERE LOWER(email) = LOWER('" + sqlEscape(targetEmail) + "') LIMIT 1;"
            );
            if (!targetExists.isBlank()) {
                continue;
            }
            runMysqlUpdate(
                "UPDATE users SET email = '" + sqlEscape(targetEmail) + "' "
                    + "WHERE LOWER(email) = LOWER('" + sqlEscape(legacyEmail) + "');"
            );
        }
    }

    private static void upsertSeedAccount(SeedAccount account) throws Exception {
        String existing = runMysqlQuery(
            "SELECT id, password_hash, password_salt FROM users "
                + "WHERE LOWER(email) = LOWER('" + sqlEscape(account.email()) + "') LIMIT 1;"
        );

        long userId;
        if (existing.isBlank()) {
            PasswordHash hash = hashPassword(account.password());
            runMysqlUpdate(
                "INSERT INTO users (email, password, password_hash, password_salt, name, role) VALUES ("
                    + "'" + sqlEscape(account.email()) + "',"
                    + "'',"
                    + "'" + sqlEscape(hash.hash()) + "',"
                    + "'" + sqlEscape(hash.salt()) + "',"
                    + "'" + sqlEscape(account.name()) + "',"
                    + "'" + sqlEscape(account.role()) + "'"
                    + ");"
            );
            userId = parseLong(
                runMysqlQuery("SELECT id FROM users WHERE LOWER(email) = LOWER('" + sqlEscape(account.email()) + "') LIMIT 1;")
            );
        } else {
            String[] parts = existing.split("\n")[0].split("\t", -1);
            userId = parseLong(parts[0]);
            String storedHash = parts.length > 1 ? parts[1] : "";
            String storedSalt = parts.length > 2 ? parts[2] : "";
            if (storedHash.isBlank() || storedSalt.isBlank()) {
                PasswordHash hash = hashPassword(account.password());
                runMysqlUpdate(
                    "UPDATE users SET "
                        + "password = '',"
                        + "password_hash = '" + sqlEscape(hash.hash()) + "',"
                        + "password_salt = '" + sqlEscape(hash.salt()) + "',"
                        + "name = '" + sqlEscape(account.name()) + "',"
                        + "role = '" + sqlEscape(account.role()) + "' "
                        + "WHERE id = " + userId + ";"
                );
            } else {
                runMysqlUpdate(
                    "UPDATE users SET "
                        + "password = '',"
                        + "name = '" + sqlEscape(account.name()) + "',"
                        + "role = '" + sqlEscape(account.role()) + "' "
                        + "WHERE id = " + userId + ";"
                );
            }
        }

        for (String companyId : account.companyIds()) {
            runMysqlUpdate(
                "INSERT IGNORE INTO user_companies (user_id, company_id) VALUES ("
                    + userId + ","
                    + "'" + sqlEscape(companyId) + "'"
                    + ");"
            );
        }
    }

    private static List<Company> loadCompaniesFromDatabase() throws Exception {
        String output = runMysqlQuery("SELECT id, name, short_name, color FROM companies ORDER BY sort_order, id;");
        List<Company> companies = new ArrayList<>();
        if (output.isBlank()) {
            return companies;
        }
        for (String line : output.split("\n")) {
            if (line.isBlank()) {
                continue;
            }
            String[] parts = line.split("\t", -1);
            if (parts.length < 4) {
                continue;
            }
            companies.add(new Company(parts[0], parts[1], parts[2], parts[3]));
        }
        return companies;
    }

    private static String loadProjectsFromDatabase(String companyId) throws Exception {
        return rowsToJson(loadProjectRecordsFromDatabase(companyId));
    }

    private static List<ProjectRow> loadProjectRecordsFromDatabase(String companyId) throws Exception {
        String sql = "SELECT id, name, description, status, priority, due_date, owners, tasks "
            + "FROM projects WHERE company_id = '" + sqlEscape(companyId) + "' ORDER BY id;";
        String output = runMysqlQuery(sql);
        List<ProjectRow> rows = new ArrayList<>();
        if (output.isBlank()) {
            return rows;
        }
        for (String line : output.split("\n")) {
            if (line.isBlank()) {
                continue;
            }
            String[] parts = line.split("\t", -1);
            if (parts.length < 8) {
                continue;
            }
            rows.add(new ProjectRow(
                (int) parseLong(parts[0]),
                parts[1],
                parts[2],
                parts[3],
                parts[4],
                parts[5],
                splitList(parts[6]),
                splitList(parts[7])
            ));
        }
        return rows;
    }

    private static String loadProjectRowsFromDatabase(String companyId) throws Exception {
        return projectRowRecordsToJson(loadProjectRowRecordsFromDatabase(companyId));
    }

    private static List<ProjectRowRecord> loadProjectRowRecordsFromDatabase(String companyId) throws Exception {
        String sql = "SELECT id, source, source_key, company_id, client_company, quo_number, quo_status, msa_number, msa_status, row_date, amount_gbp, related_invoice, deliverables, engagement_type, start_date, delivery_date, phase_1_status, phase_2_status, phase_3_status, msa_signer, note, completion_status, cell_style_json "
            + "FROM crm_project_rows WHERE company_id = '" + sqlEscape(companyId) + "' ORDER BY client_company, quo_number, id;";
        String output = runMysqlQuery(sql);
        return parseMysqlProjectRows(output, companyId);
    }

    private static void syncProjectRowsToDatabase(String companyId, List<ProjectRowRecord> rows) throws Exception {
        List<ProjectRowRecord> existingRows = loadProjectRowRecordsFromDatabase(companyId);
        Map<String, ProjectRowRecord> manualRowsBySourceKey = new HashMap<>();
        for (ProjectRowRecord existingRow : existingRows) {
            if (!"manual".equals(existingRow.source())) {
                continue;
            }
            if (existingRow.sourceKey().isBlank()) {
                continue;
            }
            manualRowsBySourceKey.put(existingRow.sourceKey(), existingRow);
        }

        StringBuilder sql = new StringBuilder();
        sql.append("DELETE FROM crm_project_rows WHERE company_id = '").append(sqlEscape(companyId)).append("' AND source <> 'manual';\n");

        for (ProjectRowRecord row : rows) {
            if (!row.sourceKey().isBlank() && manualRowsBySourceKey.containsKey(row.sourceKey())) {
                continue;
            }
            sql.append("INSERT INTO crm_project_rows (company_id, source, source_key, client_company, quo_number, quo_status, msa_number, msa_status, row_date, amount_gbp, related_invoice, deliverables, engagement_type, start_date, delivery_date, phase_1_status, phase_2_status, phase_3_status, msa_signer, note, completion_status, cell_style_json) VALUES (");
            sql.append("'").append(sqlEscape(companyId)).append("',");
            sql.append("'").append(sqlEscape(row.source())).append("',");
            sql.append("'").append(sqlEscape(row.sourceKey())).append("',");
            sql.append("'").append(sqlEscape(row.clientCompany())).append("',");
            sql.append("'").append(sqlEscape(row.quoNumber())).append("',");
            sql.append("'").append(sqlEscape(row.quoStatus())).append("',");
            sql.append("'").append(sqlEscape(row.msaNumber())).append("',");
            sql.append("'").append(sqlEscape(row.msaStatus())).append("',");
            sql.append("'").append(sqlEscape(row.date())).append("',");
            sql.append("'").append(sqlEscape(row.amountGbp())).append("',");
            sql.append("'").append(sqlEscape(row.relatedInvoice())).append("',");
            sql.append("'").append(sqlEscape(row.deliverables())).append("',");
            sql.append("'").append(sqlEscape(row.engagementType())).append("',");
            sql.append("'").append(sqlEscape(row.startDate())).append("',");
            sql.append("'").append(sqlEscape(row.deliveryDate())).append("',");
            sql.append("'").append(sqlEscape(row.phase1Status())).append("',");
            sql.append("'").append(sqlEscape(row.phase2Status())).append("',");
            sql.append("'").append(sqlEscape(row.phase3Status())).append("',");
            sql.append("'").append(sqlEscape(row.msaSigner())).append("',");
            sql.append("'").append(sqlEscape(row.note())).append("',");
            sql.append("'").append(sqlEscape(row.completionStatus())).append("',");
            sql.append("'").append(sqlEscape(row.cellStyleJson())).append("');\n");
        }

        runMysqlUpdate(sql.toString());
    }

    private static List<ProjectRowRecord> toProjectRowRecords(String companyId, List<SalesProjectRow> rows) {
        List<ProjectRowRecord> records = new ArrayList<>();
        for (SalesProjectRow row : rows) {
            records.add(new ProjectRowRecord(
                0L,
                companyId,
                row.source(),
                computeSourceKey(companyId, row.clientCompany(), row.quoNumber(), ""),
                row.clientCompany(),
                row.quoNumber(),
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                ""
            ));
        }
        return records;
    }

    private static void saveProjectRowToDatabase(ProjectRowRecord row) throws Exception {
        String sourceKey = row.sourceKey().isBlank()
            ? computeSourceKey(row.companyId(), row.clientCompany(), row.quoNumber(), row.msaNumber())
            : row.sourceKey();
        if (row.id() > 0) {
            String sql = "UPDATE crm_project_rows SET "
                + "source='" + sqlEscape(row.source()) + "',"
                + "source_key='" + sqlEscape(sourceKey) + "',"
                + "client_company='" + sqlEscape(row.clientCompany()) + "',"
                + "quo_number='" + sqlEscape(row.quoNumber()) + "',"
                + "quo_status='" + sqlEscape(row.quoStatus()) + "',"
                + "msa_number='" + sqlEscape(row.msaNumber()) + "',"
                + "msa_status='" + sqlEscape(row.msaStatus()) + "',"
                + "row_date='" + sqlEscape(row.date()) + "',"
                + "amount_gbp='" + sqlEscape(row.amountGbp()) + "',"
                + "related_invoice='" + sqlEscape(row.relatedInvoice()) + "',"
                + "deliverables='" + sqlEscape(row.deliverables()) + "',"
                + "engagement_type='" + sqlEscape(row.engagementType()) + "',"
                + "start_date='" + sqlEscape(row.startDate()) + "',"
                + "delivery_date='" + sqlEscape(row.deliveryDate()) + "',"
                + "phase_1_status='" + sqlEscape(row.phase1Status()) + "',"
                + "phase_2_status='" + sqlEscape(row.phase2Status()) + "',"
                + "phase_3_status='" + sqlEscape(row.phase3Status()) + "',"
                + "msa_signer='" + sqlEscape(row.msaSigner()) + "',"
                + "note='" + sqlEscape(row.note()) + "',"
                + "completion_status='" + sqlEscape(row.completionStatus()) + "',"
                + "cell_style_json='" + sqlEscape(row.cellStyleJson()) + "' "
                + "WHERE id = " + row.id() + ";";
            runMysqlUpdate(sql);
            return;
        }

        String sql = "INSERT INTO crm_project_rows (company_id, source, source_key, client_company, quo_number, quo_status, msa_number, msa_status, row_date, amount_gbp, related_invoice, deliverables, engagement_type, start_date, delivery_date, phase_1_status, phase_2_status, phase_3_status, msa_signer, note, completion_status, cell_style_json) VALUES ("
            + "'" + sqlEscape(row.companyId()) + "',"
            + "'" + sqlEscape(row.source()) + "',"
            + "'" + sqlEscape(sourceKey) + "',"
            + "'" + sqlEscape(row.clientCompany()) + "',"
            + "'" + sqlEscape(row.quoNumber()) + "',"
            + "'" + sqlEscape(row.quoStatus()) + "',"
            + "'" + sqlEscape(row.msaNumber()) + "',"
            + "'" + sqlEscape(row.msaStatus()) + "',"
            + "'" + sqlEscape(row.date()) + "',"
            + "'" + sqlEscape(row.amountGbp()) + "',"
            + "'" + sqlEscape(row.relatedInvoice()) + "',"
            + "'" + sqlEscape(row.deliverables()) + "',"
            + "'" + sqlEscape(row.engagementType()) + "',"
            + "'" + sqlEscape(row.startDate()) + "',"
            + "'" + sqlEscape(row.deliveryDate()) + "',"
            + "'" + sqlEscape(row.phase1Status()) + "',"
            + "'" + sqlEscape(row.phase2Status()) + "',"
            + "'" + sqlEscape(row.phase3Status()) + "',"
            + "'" + sqlEscape(row.msaSigner()) + "',"
            + "'" + sqlEscape(row.note()) + "',"
            + "'" + sqlEscape(row.completionStatus()) + "',"
            + "'" + sqlEscape(row.cellStyleJson()) + "');";
        runMysqlUpdate(sql);
    }

    private static String projectRowRecordsToJson(List<ProjectRowRecord> rows) {
        return "[" + rows.stream().map(ProjectRowRecord::toJson).reduce((a, b) -> a + "," + b).orElse("") + "]";
    }

    private static List<ProjectRowRecord> parseMysqlProjectRows(String output, String companyId) {
        List<ProjectRowRecord> rows = new ArrayList<>();
        if (output.isBlank()) {
            return rows;
        }

        for (String line : output.split("\n")) {
            if (line.isBlank()) {
                continue;
            }
            String[] parts = line.split("\t", -1);
            if (parts.length < 23) {
                continue;
            }
            rows.add(new ProjectRowRecord(
                parseLong(parts[0]),
                companyId,
                parts[1].isBlank() ? "manual" : parts[1],
                parts[2].isBlank() ? computeSourceKey(companyId, parts[4], parts[5], parts[7]) : parts[2],
                parts[4],
                parts[5],
                parts[6],
                parts[7],
                parts[8],
                parts[9],
                parts[10],
                parts[11],
                parts[12],
                parts[13],
                parts[14],
                parts[15],
                parts[16],
                parts[17],
                parts[18],
                parts[19],
                parts[20],
                parts[21],
                parts[22]
            ));
        }

        return rows;
    }

    private static long parseLong(String value) {
        try {
            return Long.parseLong(value.trim());
        } catch (Exception error) {
            return 0L;
        }
    }

    private static String env(String key, String fallback) {
        String value = System.getenv(key);
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value;
    }

    private static int envInt(String key, int fallback) {
        String value = System.getenv(key);
        if (value == null || value.isBlank()) {
            return fallback;
        }
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException error) {
            return fallback;
        }
    }

    private static Connection openConnection() throws Exception {
        return DriverManager.getConnection(JDBC_URL, DB_USER, DB_PASSWORD);
    }

    private static String runMysqlQuery(String sql) throws Exception {
        try (Connection connection = openConnection(); Statement statement = connection.createStatement()) {
            try (ResultSet resultSet = statement.executeQuery(sql)) {
                StringBuilder output = new StringBuilder();
                ResultSetMetaData metadata = resultSet.getMetaData();
                int columnCount = metadata.getColumnCount();

                while (resultSet.next()) {
                    for (int column = 1; column <= columnCount; column += 1) {
                        if (column > 1) {
                            output.append('\t');
                        }
                        String value = resultSet.getString(column);
                        if (value != null) {
                            output.append(value);
                        }
                    }
                    output.append('\n');
                }

                return output.toString().trim();
            }
        }
    }

    private static void runMysqlUpdate(String sql) throws Exception {
        try (Connection connection = openConnection(); Statement statement = connection.createStatement()) {
            statement.execute(sql);
        }
    }

    private static String sqlEscape(String value) {
        return value
            .replace("\\", "\\\\")
            .replace("'", "\\'");
    }

    private static String computeSourceKey(String companyId, String clientCompany, String quoNumber, String msaNumber) {
        return normalizeHeader(companyId)
            + "|"
            + normalizeHeader(clientCompany)
            + "|"
            + normalizeHeader(quoNumber)
            + "|"
            + normalizeHeader(msaNumber);
    }

    private static ProjectRowRecord parseProjectRowRecord(String body) {
        return new ProjectRowRecord(
            parseLong(nullToEmpty(extractJsonNumber(body, "id"))),
            nullToEmpty(extractJsonString(body, "companyId")),
            defaultIfBlank(extractJsonString(body, "source"), "manual"),
            nullToEmpty(extractJsonString(body, "sourceKey")),
            nullToEmpty(extractJsonString(body, "clientCompany")),
            nullToEmpty(extractJsonString(body, "quoNumber")),
            nullToEmpty(extractJsonString(body, "quoStatus")),
            nullToEmpty(extractJsonString(body, "msaNumber")),
            nullToEmpty(extractJsonString(body, "msaStatus")),
            nullToEmpty(extractJsonString(body, "date")),
            nullToEmpty(extractJsonString(body, "amountGbp")),
            nullToEmpty(extractJsonString(body, "relatedInvoice")),
            nullToEmpty(extractJsonString(body, "deliverables")),
            nullToEmpty(extractJsonString(body, "engagementType")),
            nullToEmpty(extractJsonString(body, "startDate")),
            nullToEmpty(extractJsonString(body, "deliveryDate")),
            nullToEmpty(extractJsonString(body, "phase1Status")),
            nullToEmpty(extractJsonString(body, "phase2Status")),
            nullToEmpty(extractJsonString(body, "phase3Status")),
            nullToEmpty(extractJsonString(body, "msaSigner")),
            nullToEmpty(extractJsonString(body, "note")),
            nullToEmpty(extractJsonString(body, "completionStatus")),
            nullToEmpty(extractJsonString(body, "cellStyleJson"))
        );
    }

    private static String readBody(InputStream inputStream) throws IOException {
        return new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
    }

    private static void respondJson(HttpExchange exchange, int status, String body) throws IOException {
        Headers headers = exchange.getResponseHeaders();
        headers.set("Content-Type", "application/json; charset=utf-8");
        headers.set("Access-Control-Allow-Origin", "*");
        headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
        headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream outputStream = exchange.getResponseBody()) {
            outputStream.write(bytes);
        }
    }

    private static Map<String, String> parseQuery(URI uri) {
        Map<String, String> result = new HashMap<>();
        String query = uri.getQuery();
        if (query == null || query.isBlank()) {
            return result;
        }
        for (String segment : query.split("&")) {
            if (segment.isBlank()) {
                continue;
            }
            String[] parts = segment.split("=", 2);
            String key = urlDecode(parts[0]);
            String value = parts.length > 1 ? urlDecode(parts[1]) : "";
            result.put(key, value);
        }
        return result;
    }

    private static String urlDecode(String value) {
        return java.net.URLDecoder.decode(value, StandardCharsets.UTF_8);
    }

    private static Company findCompany(String companyId) throws Exception {
        for (Company company : loadCompaniesFromDatabase()) {
            if (company.id().equals(companyId)) {
                return company;
            }
        }
        return null;
    }

    private static Account findAccount(String email, String password) throws Exception {
        String sql = "SELECT id, email, password, password_hash, password_salt, name, role FROM users "
            + "WHERE LOWER(email) = LOWER('" + sqlEscape(email) + "') LIMIT 1;";
        String output = runMysqlQuery(sql);
        if (output.isBlank()) {
            return null;
        }
        String[] parts = output.split("\n")[0].split("\t", -1);
        if (parts.length < 7) {
            return null;
        }
        boolean authenticated = verifyPassword(password, parts[3], parts[4]);
        if (!authenticated && !parts[2].isBlank() && parts[2].equals(password)) {
            PasswordHash hash = hashPassword(password);
            runMysqlUpdate(
                "UPDATE users SET password = '', password_hash = '" + sqlEscape(hash.hash()) + "', password_salt = '" + sqlEscape(hash.salt()) + "' "
                    + "WHERE id = " + parseLong(parts[0]) + ";"
            );
            authenticated = true;
        }
        if (!authenticated) {
            return null;
        }
        return new Account(parseLong(parts[0]), parts[1], "", parts[5], parts[6]);
    }

    private static List<Company> loadAccessibleCompaniesForUser(long userId, String role) throws Exception {
        String sql;
        if ("SUPER_ADMIN".equals(role)) {
            sql = "SELECT id, name, short_name, color FROM companies ORDER BY sort_order, id;";
        } else {
            sql = "SELECT c.id, c.name, c.short_name, c.color "
                + "FROM companies c "
                + "JOIN user_companies uc ON uc.company_id = c.id "
                + "WHERE uc.user_id = " + userId + " "
                + "ORDER BY c.sort_order, c.id;";
        }

        String output = runMysqlQuery(sql);
        List<Company> companies = new ArrayList<>();
        if (output.isBlank()) {
            return companies;
        }
        for (String line : output.split("\n")) {
            if (line.isBlank()) {
                continue;
            }
            String[] parts = line.split("\t", -1);
            if (parts.length < 4) {
                continue;
            }
            companies.add(new Company(parts[0], parts[1], parts[2], parts[3]));
        }
        return companies;
    }

    private static String extractJsonString(String json, String fieldName) {
        Pattern pattern = Pattern.compile(String.format(JSON_STRING_PATTERN_TEMPLATE.pattern(), Pattern.quote(fieldName)), Pattern.DOTALL);
        Matcher matcher = pattern.matcher(json);
        if (!matcher.find()) {
            return null;
        }
        return unescapeJsonString(matcher.group(1));
    }

    private static String extractJsonNumber(String json, String fieldName) {
        Pattern pattern = Pattern.compile("\"" + Pattern.quote(fieldName) + "\"\\s*:\\s*(\\d+)");
        Matcher matcher = pattern.matcher(json);
        if (!matcher.find()) {
            return null;
        }
        return matcher.group(1);
    }

    private static String unescapeJsonString(String value) {
        StringBuilder builder = new StringBuilder();
        boolean escaping = false;

        for (int index = 0; index < value.length(); index += 1) {
            char current = value.charAt(index);
            if (!escaping) {
                if (current == '\\') {
                    escaping = true;
                } else {
                    builder.append(current);
                }
                continue;
            }

            switch (current) {
                case '"': builder.append('"'); break;
                case '\\': builder.append('\\'); break;
                case '/': builder.append('/'); break;
                case 'b': builder.append('\b'); break;
                case 'f': builder.append('\f'); break;
                case 'n': builder.append('\n'); break;
                case 'r': builder.append('\r'); break;
                case 't': builder.append('\t'); break;
                case 'u':
                    if (index + 4 < value.length()) {
                        String hex = value.substring(index + 1, index + 5);
                        builder.append((char) Integer.parseInt(hex, 16));
                        index += 4;
                    }
                    break;
                default:
                    builder.append(current);
                    break;
            }
            escaping = false;
        }

        return builder.toString();
    }

    private static String escape(String value) {
        return value
            .replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n")
            .replace("\r", "\\r");
    }

    private static String toJsonArray(List<String> values) {
        return "[" + values.stream().map(value -> "\"" + escape(value) + "\"").reduce((a, b) -> a + "," + b).orElse("") + "]";
    }

    private static List<String> splitList(String value) {
        List<String> values = new ArrayList<>();
        if (value == null || value.isBlank()) {
            return values;
        }
        for (String part : value.split("\\|")) {
            if (part.isBlank()) {
                continue;
            }
            values.add(part);
        }
        return values;
    }

    private static PasswordHash hashPassword(String password) throws Exception {
        byte[] salt = new byte[16];
        SECURE_RANDOM.nextBytes(salt);
        String encodedSalt = Base64.getEncoder().encodeToString(salt);
        return new PasswordHash(encodePassword(password, salt), encodedSalt);
    }

    private static String encodePassword(String password, byte[] salt) throws Exception {
        SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
        KeySpec spec = new PBEKeySpec(password.toCharArray(), salt, PASSWORD_ITERATIONS, PASSWORD_KEY_LENGTH);
        return Base64.getEncoder().encodeToString(factory.generateSecret(spec).getEncoded());
    }

    private static boolean verifyPassword(String password, String storedHash, String storedSalt) throws Exception {
        if (storedHash == null || storedHash.isBlank() || storedSalt == null || storedSalt.isBlank()) {
            return false;
        }
        byte[] salt = Base64.getDecoder().decode(storedSalt);
        String computed = encodePassword(password, salt);
        return computed.equals(storedHash);
    }

    private record Company(String id, String name, String shortName, String color) {
        private String toJson() {
            return "{"
                + "\"id\":\"" + escape(id) + "\","
                + "\"name\":\"" + escape(name) + "\","
                + "\"shortName\":\"" + escape(shortName) + "\","
                + "\"color\":\"" + escape(color) + "\""
                + "}";
        }
    }

    private record Account(long id, String email, String password, String name, String role) {
    }

    private record SeedAccount(String email, String password, String name, String role, List<String> companyIds) {
    }

    private record PasswordHash(String hash, String salt) {
    }

    private record SessionRecord(String token, long userId, String currentCompanyId, String expiresAt) {
    }

    private record AuthenticatedSession(Account account, SessionRecord session) {
    }

    private static final class UnauthorizedException extends Exception {
    }

    private static final class ForbiddenException extends Exception {
    }

    private record ProjectRow(
        int id,
        String name,
        String description,
        String status,
        String priority,
        String dueDate,
        List<String> owners,
        List<String> tasks
    ) {
        private String toJson() {
            return "{"
                + "\"id\":" + id + ","
                + "\"name\":\"" + escape(name) + "\","
                + "\"description\":\"" + escape(description) + "\","
                + "\"status\":\"" + escape(status) + "\","
                + "\"priority\":\"" + escape(priority) + "\","
                + "\"dueDate\":\"" + escape(dueDate) + "\","
                + "\"owners\":" + toJsonArray(owners) + ","
                + "\"tasks\":" + toJsonArray(tasks)
                + "}";
        }
    }

    private record SalesProjectRow(
        int id,
        String source,
        String company,
        String clientCompany,
        String quoNumber
    ) {
        private String toJson() {
            return "{"
                + "\"id\":" + id + ","
                + "\"source\":\"" + escape(source) + "\","
                + "\"company\":\"" + escape(company) + "\","
                + "\"clientCompany\":\"" + escape(clientCompany) + "\","
                + "\"quoNumber\":\"" + escape(quoNumber) + "\","
                + "\"quoStatus\":\"\","
                + "\"msaNumber\":\"\","
                + "\"msaStatus\":\"\","
                + "\"date\":\"\","
                + "\"amountGbp\":\"\","
                + "\"relatedInvoice\":\"\","
                + "\"deliverables\":\"\","
                + "\"startDate\":\"\","
                + "\"deliveryDate\":\"\","
                + "\"completionStatus\":\"\""
                + "}";
        }
    }

    private record ProjectRowRecord(
        long id,
        String companyId,
        String source,
        String sourceKey,
        String clientCompany,
        String quoNumber,
        String quoStatus,
        String msaNumber,
        String msaStatus,
        String date,
        String amountGbp,
        String relatedInvoice,
        String deliverables,
        String engagementType,
        String startDate,
        String deliveryDate,
        String phase1Status,
        String phase2Status,
        String phase3Status,
        String msaSigner,
        String note,
        String completionStatus,
        String cellStyleJson
    ) {
        private String toJson() {
            return "{"
                + "\"id\":" + id + ","
                + "\"source\":\"" + escape(source) + "\","
                + "\"sourceKey\":\"" + escape(sourceKey) + "\","
                + "\"companyId\":\"" + escape(companyId) + "\","
                + "\"company\":\"\","
                + "\"clientCompany\":\"" + escape(clientCompany) + "\","
                + "\"quoNumber\":\"" + escape(quoNumber) + "\","
                + "\"quoStatus\":\"" + escape(quoStatus) + "\","
                + "\"msaNumber\":\"" + escape(msaNumber) + "\","
                + "\"msaStatus\":\"" + escape(msaStatus) + "\","
                + "\"date\":\"" + escape(date) + "\","
                + "\"amountGbp\":\"" + escape(amountGbp) + "\","
                + "\"relatedInvoice\":\"" + escape(relatedInvoice) + "\","
                + "\"deliverables\":\"" + escape(deliverables) + "\","
                + "\"engagementType\":\"" + escape(engagementType) + "\","
                + "\"startDate\":\"" + escape(startDate) + "\","
                + "\"deliveryDate\":\"" + escape(deliveryDate) + "\","
                + "\"phase1Status\":\"" + escape(phase1Status) + "\","
                + "\"phase2Status\":\"" + escape(phase2Status) + "\","
                + "\"phase3Status\":\"" + escape(phase3Status) + "\","
                + "\"msaSigner\":\"" + escape(msaSigner) + "\","
                + "\"note\":\"" + escape(note) + "\","
                + "\"completionStatus\":\"" + escape(completionStatus) + "\","
                + "\"cellStyleJson\":\"" + escape(cellStyleJson) + "\""
                + "}";
        }
    }

    private record DriveEntry(
        String id,
        String name,
        String mimeType,
        String webViewLink,
        String webContentLink,
        String modifiedTime,
        String size
    ) {
        private boolean isFolder() {
            return "application/vnd.google-apps.folder".equals(mimeType);
        }

        private String toJson() {
            return "{"
                + "\"id\":\"" + escape(id) + "\","
                + "\"name\":\"" + escape(name) + "\","
                + "\"mimeType\":\"" + escape(mimeType) + "\","
                + "\"webViewLink\":\"" + escape(nullToEmpty(webViewLink)) + "\","
                + "\"webContentLink\":\"" + escape(nullToEmpty(webContentLink)) + "\","
                + "\"modifiedTime\":\"" + escape(nullToEmpty(modifiedTime)) + "\","
                + "\"size\":\"" + escape(nullToEmpty(size)) + "\""
                + "}";
        }
    }

    private record WorkbookSheetRef(String name, String entryPath) {}

    private record WorkbookData(List<WorkbookSheet> sheets) {}

    private record WorkbookSheet(String name, List<List<String>> rows) {}

    private record HeaderMapping(int headerRowIndex, Map<String, Integer> fieldIndexes) {
        private String value(List<String> row, String fieldName) {
            Integer index = fieldIndexes.get(fieldName);
            if (index == null || index < 0 || index >= row.size()) {
                return "";
            }
            return row.get(index).trim();
        }
    }

    private record AppConfig(
        String serviceAccountJsonPath,
        Map<String, String> companyWorkbooks,
        Map<String, String> companyDriveWorkbookFileIds,
        Map<String, String> companyDriveWorkbookFileNames,
        Map<String, String> companyFolders
    ) {
        private static AppConfig load() throws IOException, ConfigurationException {
            Map<String, String> env = new LinkedHashMap<>(System.getenv());
            env.putAll(readDotEnv(Path.of(".env.local")));

            String serviceAccountJsonPath = env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
            Map<String, String> companyWorkbooks = new HashMap<>();
            putIfPresent(companyWorkbooks, "venus", env.get("VENUS_CRM_XLSX_PATH"));
            putIfPresent(companyWorkbooks, "trinity-property", env.get("TRINITY_PROPERTY_CRM_XLSX_PATH"));
            putIfPresent(companyWorkbooks, "trinity-concierge", env.get("TRINITY_CONCIERGE_CRM_XLSX_PATH"));
            putIfPresent(companyWorkbooks, "ripplesoft", env.get("RIPPLESOFT_CRM_XLSX_PATH"));
            putIfPresent(companyWorkbooks, "ripple-mic", env.get("RIPPLE_MIC_CRM_XLSX_PATH"));
            putIfPresent(companyWorkbooks, "luminarytech", env.get("LUMINARYTECH_CRM_XLSX_PATH"));
            putIfPresent(companyWorkbooks, "banyan-digital", env.get("BANYAN_DIGITAL_CRM_XLSX_PATH"));
            putIfPresent(companyWorkbooks, "momentum-growth", env.get("MOMENTUM_GROWTH_CRM_XLSX_PATH"));
            putIfPresent(companyWorkbooks, "biocheck", env.get("BIOCHECK_CRM_XLSX_PATH"));
            putIfPresent(companyWorkbooks, "crestpoint-hr", env.get("CRESTPOINT_HR_CRM_XLSX_PATH"));
            putIfPresent(companyWorkbooks, "novasoft-tech", env.get("NOVASOFT_TECH_CRM_XLSX_PATH"));

            Map<String, String> companyDriveWorkbookFileIds = new HashMap<>();
            putIfPresent(companyDriveWorkbookFileIds, "venus", env.get("VENUS_CRM_DRIVE_FILE_ID"));
            putIfPresent(companyDriveWorkbookFileIds, "trinity-property", env.get("TRINITY_PROPERTY_CRM_DRIVE_FILE_ID"));
            putIfPresent(companyDriveWorkbookFileIds, "trinity-concierge", env.get("TRINITY_CONCIERGE_CRM_DRIVE_FILE_ID"));
            putIfPresent(companyDriveWorkbookFileIds, "ripplesoft", env.get("RIPPLESOFT_CRM_DRIVE_FILE_ID"));
            putIfPresent(companyDriveWorkbookFileIds, "ripple-mic", env.get("RIPPLE_MIC_CRM_DRIVE_FILE_ID"));
            putIfPresent(companyDriveWorkbookFileIds, "luminarytech", env.get("LUMINARYTECH_CRM_DRIVE_FILE_ID"));
            putIfPresent(companyDriveWorkbookFileIds, "banyan-digital", env.get("BANYAN_DIGITAL_CRM_DRIVE_FILE_ID"));
            putIfPresent(companyDriveWorkbookFileIds, "momentum-growth", env.get("MOMENTUM_GROWTH_CRM_DRIVE_FILE_ID"));
            putIfPresent(companyDriveWorkbookFileIds, "biocheck", env.get("BIOCHECK_CRM_DRIVE_FILE_ID"));
            putIfPresent(companyDriveWorkbookFileIds, "crestpoint-hr", env.get("CRESTPOINT_HR_CRM_DRIVE_FILE_ID"));
            putIfPresent(companyDriveWorkbookFileIds, "novasoft-tech", env.get("NOVASOFT_TECH_CRM_DRIVE_FILE_ID"));

            Map<String, String> companyDriveWorkbookFileNames = new HashMap<>();
            putIfPresent(companyDriveWorkbookFileNames, "venus", env.get("VENUS_CRM_DRIVE_FILE_NAME"));
            putIfPresent(companyDriveWorkbookFileNames, "trinity-property", env.get("TRINITY_PROPERTY_CRM_DRIVE_FILE_NAME"));
            putIfPresent(companyDriveWorkbookFileNames, "trinity-concierge", env.get("TRINITY_CONCIERGE_CRM_DRIVE_FILE_NAME"));
            putIfPresent(companyDriveWorkbookFileNames, "ripplesoft", env.get("RIPPLESOFT_CRM_DRIVE_FILE_NAME"));
            putIfPresent(companyDriveWorkbookFileNames, "ripple-mic", env.get("RIPPLE_MIC_CRM_DRIVE_FILE_NAME"));
            putIfPresent(companyDriveWorkbookFileNames, "luminarytech", env.get("LUMINARYTECH_CRM_DRIVE_FILE_NAME"));
            putIfPresent(companyDriveWorkbookFileNames, "banyan-digital", env.get("BANYAN_DIGITAL_CRM_DRIVE_FILE_NAME"));
            putIfPresent(companyDriveWorkbookFileNames, "momentum-growth", env.get("MOMENTUM_GROWTH_CRM_DRIVE_FILE_NAME"));
            putIfPresent(companyDriveWorkbookFileNames, "biocheck", env.get("BIOCHECK_CRM_DRIVE_FILE_NAME"));
            putIfPresent(companyDriveWorkbookFileNames, "crestpoint-hr", env.get("CRESTPOINT_HR_CRM_DRIVE_FILE_NAME"));
            putIfPresent(companyDriveWorkbookFileNames, "novasoft-tech", env.get("NOVASOFT_TECH_CRM_DRIVE_FILE_NAME"));

            if (companyWorkbooks.isEmpty()
                && companyDriveWorkbookFileNames.isEmpty()
                && (serviceAccountJsonPath == null || serviceAccountJsonPath.isBlank())) {
                throw new ConfigurationException("Set a company CRM workbook path or GOOGLE_SERVICE_ACCOUNT_JSON in backend-java/.env.local");
            }

            Map<String, String> companyFolders = new HashMap<>();
            putIfPresent(companyFolders, "venus", env.get("GOOGLE_DRIVE_VENUS_FOLDER_ID"));
            putIfPresent(companyFolders, "trinity-property", env.get("GOOGLE_DRIVE_TRINITY_PROPERTY_FOLDER_ID"));
            putIfPresent(companyFolders, "trinity-concierge", env.get("GOOGLE_DRIVE_TRINITY_CONCIERGE_FOLDER_ID"));
            putIfPresent(companyFolders, "ripplesoft", env.get("GOOGLE_DRIVE_RIPPLESOFT_FOLDER_ID"));
            putIfPresent(companyFolders, "ripple-mic", env.get("GOOGLE_DRIVE_RIPPLE_MIC_FOLDER_ID"));
            putIfPresent(companyFolders, "luminarytech", env.get("GOOGLE_DRIVE_LUMINARYTECH_FOLDER_ID"));
            putIfPresent(companyFolders, "banyan-digital", env.get("GOOGLE_DRIVE_BANYAN_DIGITAL_FOLDER_ID"));
            putIfPresent(companyFolders, "momentum-growth", env.get("GOOGLE_DRIVE_MOMENTUM_GROWTH_FOLDER_ID"));
            putIfPresent(companyFolders, "biocheck", env.get("GOOGLE_DRIVE_BIOCHECK_FOLDER_ID"));
            putIfPresent(companyFolders, "crestpoint-hr", env.get("GOOGLE_DRIVE_CRESTPOINT_HR_FOLDER_ID"));
            putIfPresent(companyFolders, "novasoft-tech", env.get("GOOGLE_DRIVE_NOVASOFT_TECH_FOLDER_ID"));

            return new AppConfig(serviceAccountJsonPath, companyWorkbooks, companyDriveWorkbookFileIds, companyDriveWorkbookFileNames, companyFolders);
        }

        private String workbookPathForCompany(String companyId) {
            return companyWorkbooks.get(companyId);
        }

        private String driveWorkbookFileNameForCompany(String companyId) {
            return companyDriveWorkbookFileNames.get(companyId);
        }

        private String driveWorkbookFileIdForCompany(String companyId) {
            return companyDriveWorkbookFileIds.get(companyId);
        }

        private String folderIdForCompany(String companyId) {
            return companyFolders.get(companyId);
        }

        private static void putIfPresent(Map<String, String> target, String key, String value) {
            if (value != null && !value.isBlank()) {
                target.put(key, value);
            }
        }
    }

    private record ServiceAccountCredentials(
        String clientEmail,
        String tokenUri,
        PrivateKey privateKey
    ) {
        private static ServiceAccountCredentials fromFile(String filePath) throws Exception {
            String json = Files.readString(Path.of(filePath), StandardCharsets.UTF_8);
            String clientEmail = extractJsonString(json, "client_email");
            String tokenUri = extractJsonString(json, "token_uri");
            String privateKeyPem = extractJsonString(json, "private_key");

            if (clientEmail == null || tokenUri == null || privateKeyPem == null) {
                throw new ConfigurationException("Service account JSON is missing required fields");
            }

            return new ServiceAccountCredentials(clientEmail, tokenUri, parsePrivateKey(privateKeyPem));
        }
    }

    private static PrivateKey parsePrivateKey(String privateKeyPem) throws Exception {
        String normalized = privateKeyPem
            .replace("-----BEGIN PRIVATE KEY-----", "")
            .replace("-----END PRIVATE KEY-----", "")
            .replaceAll("\\s+", "");
        byte[] der = Base64.getDecoder().decode(normalized);
        PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(der);
        return KeyFactory.getInstance("RSA").generatePrivate(spec);
    }

    private static Map<String, String> readDotEnv(Path path) throws IOException {
        Map<String, String> values = new HashMap<>();
        if (!Files.exists(path)) {
            return values;
        }

        for (String rawLine : Files.readAllLines(path, StandardCharsets.UTF_8)) {
            String line = rawLine.trim();
            if (line.isBlank() || line.startsWith("#")) {
                continue;
            }
            String[] parts = line.split("=", 2);
            if (parts.length != 2) {
                continue;
            }
            values.put(parts[0].trim(), stripQuotes(parts[1].trim()));
        }

        return values;
    }

    private static String stripQuotes(String value) {
        if (value.length() >= 2) {
            if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
                return value.substring(1, value.length() - 1);
            }
        }
        return value;
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private static String stripFileExtension(String fileName) {
        int dotIndex = fileName.lastIndexOf('.');
        if (dotIndex <= 0) {
            return fileName;
        }
        return fileName.substring(0, dotIndex);
    }

    private static String defaultIfBlank(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private static final class ConfigurationException extends Exception {
        private ConfigurationException(String message) {
            super(message);
        }
    }
}
