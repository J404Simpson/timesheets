import React, { useState } from "react";
import { useMsal } from "@azure/msal-react";

export default function SignOutButton() {
  const { instance } = useMsal();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      // Use redirect flow for better mobile compatibility
      await instance.logoutRedirect({
        mainWindowRedirectUri: "/"
      });
    } catch (err: any) {
      setIsLoading(false);
      console.error("Logout error:", err);
    }
  };

  return (
    <button onClick={handleLogout} className="btn btn-secondary" disabled={isLoading}>
      {isLoading ? "Signing out..." : "Sign out"}
    </button>
  );
}