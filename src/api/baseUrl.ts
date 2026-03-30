function sanitize(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

// Resolve API base URL in this order:
// 1) VITE_API_URL from build-time env
// 2) Local dev default when running on localhost
// 3) Production fallback for Azure App Service
export function getApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL;
  if (typeof fromEnv === "string" && fromEnv.trim().length > 0) {
    return sanitize(fromEnv);
  }

  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return "http://localhost:5000";
  }

  return "https://timesheetsapi.azurewebsites.net";
}
