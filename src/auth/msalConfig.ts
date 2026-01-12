import type { Configuration } from "@azure/msal-browser";
import { PublicClientApplication, LogLevel } from "@azure/msal-browser";

function resolveEnvValue(
  ...values: Array<string | undefined>
): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return "";
}

const tenantId =
  resolveEnvValue(
    import.meta.env.VITE_AAD_TENANT_ID,
    import.meta.env.VITE_LOCAL_AAD_TENANT_ID,
    "common"
  ) || "common";

const clientId = resolveEnvValue(
  import.meta.env.VITE_AAD_CLIENT_ID,
  import.meta.env.VITE_LOCAL_AAD_CLIENT_ID
);

const apiScope = resolveEnvValue(
  import.meta.env.VITE_AAD_API_SCOPE,
  import.meta.env.VITE_LOCAL_AAD_API_SCOPE
);

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

const msalInstance = new PublicClientApplication(msalConfig);

export async function acquireTokenSilent(scopes: string[]): Promise<string> {
  const activeAccount = msalInstance.getActiveAccount();
  if (!activeAccount) throw new Error("No active account! Ensure you are logged in.");

  try {
    const response = await msalInstance.acquireTokenSilent({
      account: activeAccount,
      scopes,
    });
    return response.accessToken;
  } catch (error) {
    console.error("Failed to silently acquire token:", error);
    throw error;
  }
}

export default msalConfig;
