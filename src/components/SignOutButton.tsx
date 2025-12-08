import React from "react";
import { useMsal } from "@azure/msal-react";

export default function SignOutButton() {
  const { instance } = useMsal();

  const handleLogout = async () => {
    try {
      await instance.logoutPopup({
        mainWindowRedirectUri: "/"
      });
    } catch (e) {
      try {
        await instance.logoutRedirect({
          mainWindowRedirectUri: "/"
        });
      } catch (err) {
        console.error("Logout failed:", err);
      }
    }
  };

  return (
    <button onClick={handleLogout} className="btn btn-secondary">
      Sign out
    </button>
  );
}