import React from "react";
import ReactDOM from "react-dom/client";
import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import App from "./App";
import msalConfig from "./auth/msalConfig";
import "./index.css";

const msalInstance = new PublicClientApplication(msalConfig);

// Initialize MSAL and handle redirect responses
msalInstance.initialize().then(() => {
  // Handle redirect promise and set active account
  msalInstance.handleRedirectPromise().then((response) => {
    if (response && response.account) {
      msalInstance.setActiveAccount(response.account);
    } else {
      // If no response, check if there's already an account and set it as active
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        msalInstance.setActiveAccount(accounts[0]);
      }
    }

    // Render the app after MSAL is ready
    ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
      <React.StrictMode>
        <MsalProvider instance={msalInstance}>
          <App />
        </MsalProvider>
      </React.StrictMode>
    );
  });
});