import React, { useState } from "react";
import "./App.css";
import SignInButton from "./components/SignInButton";
import Profile from "./components/Profile";
import { useMsal } from "@azure/msal-react";
import Recent from "./components/Recent";
import History from "./components/History";
import TimeSheetForm from "./components/TimeSheetForm";

const App: React.FC = () => {
  const { accounts } = useMsal();
  const isAuthenticated = Array.isArray(accounts) && accounts.length > 0;

  const [showNewEntryForm, setShowNewEntryForm] = useState(false);
  const [view, setView] = useState<"recent" | "history">("recent");

  const openCreate = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return;
    setShowNewEntryForm(true);
  };

  const goRecent = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return;
    setShowNewEntryForm(false);
    setView("recent");
  };

  const goHistory = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return;
    setShowNewEntryForm(false);
    setView("history");
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Timesheets</h1>

        <nav className="app-nav" aria-label="Main navigation">
          <a
            className={`nav-link ${!isAuthenticated ? "disabled" : ""}`}
            href={isAuthenticated ? "#create" : undefined}
            role="button"
            aria-disabled={!isAuthenticated}
            tabIndex={isAuthenticated ? 0 : -1}
            onClick={openCreate}
            aria-controls="new-entry-form"
          >
            Create
          </a>

          <a
            className={`nav-link ${!isAuthenticated ? "disabled" : ""}`}
            href={isAuthenticated ? "#recent" : undefined}
            role="button"
            aria-disabled={!isAuthenticated}
            tabIndex={isAuthenticated ? 0 : -1}
            onClick={goRecent}
          >
            Recent
          </a>

          <a
            className={`nav-link ${!isAuthenticated ? "disabled" : ""}`}
            href={isAuthenticated ? "#history" : undefined}
            role="button"
            aria-disabled={!isAuthenticated}
            tabIndex={isAuthenticated ? 0 : -1}
            onClick={goHistory}
          >
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
            {!showNewEntryForm ? (
              view === "recent" ? (
                <Recent />
              ) : (
                <History />
              )
            ) : (
              <section id="new-entry-form" className="new-entry-section" aria-live="polite">
                <div className="new-entry-header">
                  <h2>New Entry</h2>
                </div>

                <TimeSheetForm
                  onCancel={() => {
                    setShowNewEntryForm(false);
                    setView("recent");
                  }}
                />
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