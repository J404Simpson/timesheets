import React, { useState } from "react";
import "./App.css";
import SignInButton from "./components/SignInButton";
import Profile from "./components/Profile";
import { useMsal } from "@azure/msal-react";
import RecentActivity from "./components/RecentActivity";
import TimeSheetForm from "./components/TimeSheetForm";

const App: React.FC = () => {
  const { accounts } = useMsal();
  const isAuthenticated = Array.isArray(accounts) && accounts.length > 0;
  const [showNewEntryForm, setShowNewEntryForm] = useState(false);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Timesheets</h1>

        <nav className="app-nav" aria-label="Main navigation">

          <a
            className={`nav-link ${!isAuthenticated ? "disabled" : ""}`}
            href={isAuthenticated ? "#create" : undefined}
            role="link"
            aria-disabled={!isAuthenticated}
            tabIndex={isAuthenticated ? 0 : -1}
            onClick={(e) => {
              if (!isAuthenticated) e.preventDefault();
            }}>
            Create
          </a>

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

          <a
            className={`nav-link ${!isAuthenticated ? "disabled" : ""}`}
            href={isAuthenticated ? "#history" : undefined}
            role="link"
            aria-disabled={!isAuthenticated}
            tabIndex={isAuthenticated ? 0 : -1}
            onClick={(e) => {
              if (!isAuthenticated) e.preventDefault();
            }}>
            History
          </a>

        </nav>

        <div className="auth-area">{isAuthenticated ? <Profile /> : null}</div>
      </header>

      <main className="app-main">
        {!isAuthenticated ? (
          <div className="centered">
            <SignInButton />
          </div>
        ) : (
          <>
            <section className="hero" aria-hidden={showNewEntryForm}>
              <div className="hero-actions">
                {!showNewEntryForm && (
                  <button
                    className="btn primary"
                    onClick={() => setShowNewEntryForm(true)}
                    aria-controls="new-entry-form"
                  >
                    New Entry
                  </button>
                )}
              </div>
            </section>

            {!showNewEntryForm ? (
              <RecentActivity />
            ) : (
              <section id="new-entry-form" className="new-entry-section" aria-live="polite">
                <div className="new-entry-header">
                  <h2>New Entry</h2>
                  <button
                    className="btn secondary"
                    onClick={() => setShowNewEntryForm(false)}
                    aria-label="Cancel new entry"
                  >
                    Cancel
                  </button>
                </div>

                <TimeSheetForm />
              </section>
            )}
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