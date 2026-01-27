import React from "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../auth/msalConfig";

export default function SignInButton() {
  const { instance } = useMsal();

  const handleLogin = async () => {
    try {
      const response = await instance.loginPopup(loginRequest);
      // Set the active account after successful login
      instance.setActiveAccount(response.account);
    } catch (e) {
      // fallback to redirect if popup fails
      try {
        await instance.loginRedirect(loginRequest);
      } catch (err) {
        // Login failed silently
      }
    }
  };

  return (
    <button onClick={handleLogin} className="sign-in-button">
      Sign in
    </button>
  );
}