import "dotenv/config";

const frontendUrlEnv = process.env.FRONTEND_URL ?? "http://localhost:5173";
const normalizedFrontendUrl = frontendUrlEnv.endsWith("/")
  ? frontendUrlEnv.slice(0, -1)
  : frontendUrlEnv;

const frontendUrlsEnv = process.env.FRONTEND_URLS
  ? process.env.FRONTEND_URLS.split(",").map((value) => {
    const trimmed = value.trim();
    return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
  })
  : [];

const defaultFrontendOrigins = new Set<string>([
  normalizedFrontendUrl,
  normalizedFrontendUrl.replace(/:(\d+)$/, ":5173"),
  normalizedFrontendUrl.replace(/:(\d+)$/, ":5174"),
]);
frontendUrlsEnv.forEach((url) => {
  if (url) {
    defaultFrontendOrigins.add(url);
  }
});

const frontendOrigins = Array.from(defaultFrontendOrigins);
const defaultInviteBaseUrl = process.env.INVITE_BASE_URL
  ? process.env.INVITE_BASE_URL
  : `${normalizedFrontendUrl}/invite`;

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  frontendUrl: normalizedFrontendUrl,
  frontendOrigins,
  databaseUrl: process.env.DATABASE_URL,
  dbHost: process.env.DB_HOST,
  dbName: process.env.DB_NAME ?? "investo",
  dbUser: process.env.DB_USER ?? "postgres",
  dbPassword: process.env.DB_PASSWORD ?? "",
  dbPort: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  dbSsl: process.env.DB_SSL === "true",
  databaseLogging: process.env.DB_LOGGING === "true",
  inviteBaseUrl: defaultInviteBaseUrl,
};

export function assertEnv() {
  if (!env.databaseUrl && !env.dbHost) {
    console.warn(
      "DATABASE_URL or DB_HOST not provided. Falling back to default Render credentials."
    );
  }
}

