import React from "react";
import { useMsal } from "@azure/msal-react";

export default function Profile() {
  const { accounts } = useMsal();
  const account = accounts && accounts[0];

  if (!account) {
    return <span className="profile">Not signed in</span>;
  }

  return (
    <span className="profile">
      <strong>{account.name ?? account.username}</strong>
    </span>
  );
}