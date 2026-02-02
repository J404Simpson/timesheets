import React, { useState, useEffect } from "react";
import "./App.css";
import SignInButton from "./components/SignInButton";
import Profile from "./components/Profile";
import { useMsal } from "@azure/msal-react";
import Recent from "./components/Recent";
import History from "./components/History";
import TimeSheetForm from "./components/TimeSheetForm";
import { notifyLogin } from "./api/timesheet";
import DepartmentModal from "./components/DepartmentModal";
import { createEmployee } from "./api/department";

const App: React.FC = () => {

  const { accounts } = useMsal();
  const isAuthenticated = Array.isArray(accounts) && accounts.length > 0;

  const [showNewEntryForm, setShowNewEntryForm] = useState(false);
  const [view, setView] = useState<"recent" | "history">("recent");
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [selectedHour, setSelectedHour] = useState<number | undefined>(undefined);
  const [selectedMinute, setSelectedMinute] = useState<number | undefined>(undefined);
  const [pendingUser, setPendingUser] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    object_id: string;
  } | null>(null);
  const [isOnboarded, setIsOnboarded] = useState(false);

  // Notify API when user logs in
  useEffect(() => {
    if (isAuthenticated && accounts[0]) {
      const account = accounts[0];
      const firstName = account.name?.split(" ")[0] || "";
      const lastName = account.name?.split(" ").slice(1).join(" ") || "";
      const email = account.username || "";
      const object_id = account.localAccountId || account.homeAccountId || "";

      notifyLogin(firstName, lastName, email, object_id)
        .then((data) => {
          if (data && data.status === "department_required") {
            setPendingUser({ firstName, lastName, email, object_id });
            setShowDepartmentModal(true);
            setIsOnboarded(false);
          } else {
            setIsOnboarded(true);
          }
        })
        .catch(() => {
          // Failed to send user details
        });
    }
  }, [isAuthenticated, accounts]);

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

  const handleDateSelect = (date: string, hour?: number, minute?: number) => {
    setSelectedDate(date);
    setSelectedHour(hour);
    setSelectedMinute(minute);
    setShowNewEntryForm(true);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Timesheets</h1>

        <nav className="app-nav" aria-label="Main navigation">
          <a
            className={`nav-link ${!isAuthenticated || showDepartmentModal ? "disabled" : ""}`}
            href={isAuthenticated && !showDepartmentModal ? "#create" : undefined}
            role="button"
            aria-disabled={!isAuthenticated || showDepartmentModal}
            tabIndex={isAuthenticated && !showDepartmentModal ? 0 : -1}
            onClick={openCreate}
            aria-controls="new-entry-form"
          >
            Create
          </a>

          <a
            className={`nav-link ${!isAuthenticated || showDepartmentModal ? "disabled" : ""}`}
            href={isAuthenticated && !showDepartmentModal ? "#recent" : undefined}
            role="button"
            aria-disabled={!isAuthenticated || showDepartmentModal}
            tabIndex={isAuthenticated && !showDepartmentModal ? 0 : -1}
            onClick={goRecent}
          >
            Recent
          </a>

          <a
            className={`nav-link ${!isAuthenticated || showDepartmentModal ? "disabled" : ""}`}
            href={isAuthenticated && !showDepartmentModal ? "#history" : undefined}
            role="button"
            aria-disabled={!isAuthenticated || showDepartmentModal}
            tabIndex={isAuthenticated && !showDepartmentModal ? 0 : -1}
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
            <DepartmentModal
              open={showDepartmentModal}
              onSubmit={async (departmentId) => {
                if (pendingUser) {
                  await createEmployee(
                    pendingUser.firstName,
                    pendingUser.lastName,
                    pendingUser.email,
                    pendingUser.object_id,
                    departmentId
                  );
                  setShowDepartmentModal(false);
                  setPendingUser(null);
                  setIsOnboarded(true);
                }
              }}
            />
            {isOnboarded && !showDepartmentModal && (!showNewEntryForm ? (
              view === "recent" ? (
                <Recent onSelectDate={handleDateSelect} />
              ) : (
                <History />
              )
            ) : (
              <section id="new-entry-form" className="new-entry-section" aria-live="polite">
                {/* Removed the New Entry header from App; TimeSheetForm renders it now */}
                <TimeSheetForm
                  initialDate={selectedDate}
                  initialMinute={selectedMinute}
                  onCancel={() => {
                    setShowNewEntryForm(false);
                    setSelectedDate(undefined);
                    setSelectedHour(undefined);
                    setSelectedMinute(undefined);
                    setSelectedHour(undefined);
                    setView("recent");
                  }}
                />
              </section>
            ))}
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