import React from "react";
import "./App.css";
import SignInButton from "./components/SignInButton";
import Profile from "./components/Profile";
import { useMsal } from "@azure/msal-react";
import RecentActivity from "./components/RecentActivity";

const App: React.FC = () => {
  const { accounts } = useMsal();
  const isAuthenticated = Array.isArray(accounts) && accounts.length > 0;

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Timesheets</h1>

        <nav className="app-nav" aria-label="Main navigation">
          <a
            className={`nav-link ${!isAuthenticated ? "disabled" : ""}`}
            href={isAuthenticated ? "#history" : undefined}
            role="link"
            aria-disabled={!isAuthenticated}
            tabIndex={isAuthenticated ? 0 : -1}
            onClick={(e) => {
              if (!isAuthenticated) e.preventDefault();
            }}>
            History</a>
          <a
            className={`nav-link ${!isAuthenticated ? "disabled" : ""}`}
            href={isAuthenticated ? "#recent" : undefined}
            role="link"
            aria-disabled={!isAuthenticated}
            tabIndex={isAuthenticated ? 0 : -1}
            onClick={(e) => {
              if (!isAuthenticated) e.preventDefault();
            }}
          >
            Recent
          </a>
        </nav>

        <div className="auth-area">
          {isAuthenticated ? <Profile /> : null}
        </div>
      </header>

      <main className="app-main">
        {!isAuthenticated ? (
          <div className="centered">
            <SignInButton />
          </div>
        ) : (
          <>
            <section className="hero">
              <p className="muted">
              </p>
              <div className="hero-actions">
                <button className="btn primary">New Entry</button>
              </div>
            </section>

            {/* Replaced inline placeholder with RecentActivity component (keeps fallback inside the component) */}
            <RecentActivity />

          </>
        )}
      </main>

      <footer className="app-footer">
        <small>© {new Date().getFullYear()} Timesheets (local)</small>
      </footer>
    </div>
  );
};

export default App;