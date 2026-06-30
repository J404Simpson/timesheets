import React, { useState } from "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../auth/msalConfig";

export default function SignInButton() {
  const { instance } = useMsal();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setError(null);
    setIsLoading(true);
    try {
      // Use redirect flow for better mobile compatibility
      await instance.loginRedirect(loginRequest);
    } catch (err: any) {
      setIsLoading(false);
      const errorMsg = err?.errorCode || err?.message || "Login failed. Please try again.";
      setError(errorMsg);
      console.error("Login error:", err);
    }
  };

  return (
    <div>
      <button onClick={handleLogin} className="sign-in-button" disabled={isLoading}>
        {isLoading ? "Signing in..." : "Sign in"}
      </button>
      {error && <div className="error-message" style={{ color: "#d32f2f", marginTop: "8px", fontSize: "14px" }}>{error}</div>}
    </div>
  );
}