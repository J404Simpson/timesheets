import type { Configuration } from "@azure/msal-browser";
import { LogLevel } from "@azure/msal-browser";

const tenantId = import.meta.env.VITE_AAD_TENANT_ID ?? "common";
const clientId = import.meta.env.VITE_AAD_CLIENT_ID ?? "";
const apiScope = import.meta.env.VITE_AAD_API_SCOPE ?? "";

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
          case LogLevel.Info:
            console.info(message);
            return;
          case LogLevel.Verbose:
          default:
            console.debug(message);
            return;
        }
      },
      logLevel: LogLevel.Info,
      piiLoggingEnabled: false,
    },
  },
};

export const loginRequest = {
  scopes: ["openid", "profile", "email"],
};

export const protectedResources = {
  timesheetApi: {
    scope: apiScope,
  },
};

export default msalConfig;
