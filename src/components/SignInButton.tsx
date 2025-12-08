import React from "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../auth/msalConfig";

export default function SignInButton() {
  const { instance } = useMsal();

  const handleLogin = async () => {
    try {
      await instance.loginPopup(loginRequest);
    } catch (e) {
      // fallback to redirect if popup fails
      try {
        await instance.loginRedirect(loginRequest);
      } catch (err) {
        console.error("Login failed:", err);
      }
    }
  };

  return (
    <button onClick={handleLogin} className="sign-in-button">
      Sign in
    </button>
  );
}