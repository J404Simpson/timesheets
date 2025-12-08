import React from "react";
import { useIsAuthenticated } from "@azure/msal-react";

type Props = {
  children: React.ReactNode;
};

export default function ProtectedRoute({ children }: Props) {
  const isAuthenticated = useIsAuthenticated();

  if (!isAuthenticated) {
    return (
      <section>
        <h2>Access denied</h2>
        <p>You must sign in to access this page.</p>
      </section>
    );
  }

  return <>{children}</>;
}