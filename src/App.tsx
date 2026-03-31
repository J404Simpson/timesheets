import React, { useState, useEffect } from "react";
import "./App.css";
import SignInButton from "./components/SignInButton";
import Profile from "./components/Profile";
import { useMsal } from "@azure/msal-react";
import Recent from "./components/Recent";
import Admin from "./components/Admin";
import TimeSheetForm from "./components/TimeSheetForm";
import { notifyLogin, getCurrentUser, type WeekEntry } from "./api/timesheet";
import DepartmentModal from "./components/DepartmentModal";
import { createEmployee } from "./api/department";

const App: React.FC = () => {

  const { accounts } = useMsal();
  const isAuthenticated = Array.isArray(accounts) && accounts.length > 0;

  const [showNewEntryForm, setShowNewEntryForm] = useState(false);
  const [view, setView] = useState<"recent" | "admin">("recent");
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [selectedHour, setSelectedHour] = useState<number | undefined>(undefined);
  const [selectedMinute, setSelectedMinute] = useState<number | undefined>(undefined);
  const [selectedEndHour, setSelectedEndHour] = useState<number | undefined>(undefined);
  const [selectedEndMinute, setSelectedEndMinute] = useState<number | undefined>(undefined);
  const [editingEntry, setEditingEntry] = useState<WeekEntry | undefined>(undefined);
  const [targetEmployeeId, setTargetEmployeeId] = useState<number | undefined>(undefined);
  const [pendingUser, setPendingUser] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    object_id: string;
  } | null>(null);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [calendarRefreshToken, setCalendarRefreshToken] = useState(0);

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
            setIsAdmin(false);
          } else {
            setIsOnboarded(true);
            getCurrentUser()
              .then((employee) => {
                setIsAdmin(employee?.admin === true);
              })
              .catch(() => {
                setIsAdmin(false);
              });
          }
        })
        .catch(() => {
          // Failed to send user details
        });
    }
  }, [isAuthenticated, accounts]);

  const openCreate = (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (!isAuthenticated) return;
    setView("recent");
    setShowNewEntryForm(true);
  };

  const goAdminFromRecent = () => {
    if (!isAuthenticated || !isAdmin) return;
    setShowNewEntryForm(false);
    setView("admin");
  };

  const goRecentFromAdmin = () => {
    setShowNewEntryForm(false);
    setView("recent");
  };

  useEffect(() => {
    if (!isAdmin && view === "admin") {
      setView("recent");
    }
  }, [isAdmin, view]);

  const closeEntryForm = () => {
    setShowNewEntryForm(false);
    setSelectedDate(undefined);
    setSelectedHour(undefined);
    setSelectedMinute(undefined);
    setSelectedEndHour(undefined);
    setSelectedEndMinute(undefined);
    setEditingEntry(undefined);
    setTargetEmployeeId(undefined);
  };

  const handleEntrySaved = () => {
    closeEntryForm();
    setCalendarRefreshToken((prev) => prev + 1);
  };

  useEffect(() => {
    if (!showNewEntryForm) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeEntryForm();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showNewEntryForm]);

  const handleDateSelect = (date: string, hour?: number, minute?: number, endHour?: number, endMinute?: number) => {
    setSelectedDate(date);
    setSelectedHour(hour);
    setSelectedMinute(minute);
    setSelectedEndHour(endHour);
    setSelectedEndMinute(endMinute);
    setEditingEntry(undefined);
    setTargetEmployeeId(undefined);
    setView("recent");
    setShowNewEntryForm(true);
  };

  const handleEditEntry = (entry: WeekEntry) => {
    setEditingEntry(entry);
    setSelectedDate(undefined);
    setSelectedHour(undefined);
    setSelectedMinute(undefined);
    setSelectedEndHour(undefined);
    setSelectedEndMinute(undefined);
    setTargetEmployeeId(undefined);
    setView("recent");
    setShowNewEntryForm(true);
  };

  const handleAdminEditEntry = (entry: WeekEntry, employeeId: number) => {
    setEditingEntry(entry);
    setSelectedDate(undefined);
    setSelectedHour(undefined);
    setSelectedMinute(undefined);
    setSelectedEndHour(undefined);
    setSelectedEndMinute(undefined);
    setTargetEmployeeId(employeeId);
    setView("admin");
    setShowNewEntryForm(true);
  };

  const handleAdminCreateEntry = (employeeId: number) => {
    setEditingEntry(undefined);
    setSelectedDate(undefined);
    setSelectedHour(undefined);
    setSelectedMinute(undefined);
    setSelectedEndHour(undefined);
    setSelectedEndMinute(undefined);
    setTargetEmployeeId(employeeId);
    setView("admin");
    setShowNewEntryForm(true);
  };

  const handleAdminDateSelect = (
    employeeId: number,
    date: string,
    hour?: number,
    minute?: number,
    endHour?: number,
    endMinute?: number
  ) => {
    setSelectedDate(date);
    setSelectedHour(hour);
    setSelectedMinute(minute);
    setSelectedEndHour(endHour);
    setSelectedEndMinute(endMinute);
    setEditingEntry(undefined);
    setTargetEmployeeId(employeeId);
    setView("admin");
    setShowNewEntryForm(true);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-left">
          <h1 className="app-title">Timesheets</h1>
        </div>

        <div className="app-logo" aria-hidden="true">
          <img src="/veryan-logo.png" alt="Veryan" />
        </div>

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
            {isOnboarded && !showDepartmentModal && (
              <>
                {view === "admin" && isAdmin ? (
                  <Admin
                    onEditEntryForUser={handleAdminEditEntry}
                    onCreateEntryForUser={handleAdminCreateEntry}
                    onSelectDateForUser={handleAdminDateSelect}
                    onBackToRecent={goRecentFromAdmin}
                    refreshToken={calendarRefreshToken}
                  />
                ) : (
                  <Recent
                    onCreateEntry={() => openCreate()}
                    onSelectDate={handleDateSelect}
                    onEditEntry={handleEditEntry}
                    onGoAdmin={goAdminFromRecent}
                    showAdminButton={isAdmin && !showDepartmentModal}
                    refreshToken={calendarRefreshToken}
                  />
                )}

                {showNewEntryForm && (
                  <div className="entry-modal-backdrop" role="presentation" onClick={closeEntryForm}>
                    <section
                      id="new-entry-form"
                      className="entry-modal"
                      role="dialog"
                      aria-modal="true"
                      aria-live="polite"
                      aria-label={editingEntry ? "Edit entry" : "Create entry"}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="entry-modal-close"
                        onClick={closeEntryForm}
                        aria-label="Close entry form"
                      >
                        x
                      </button>

                      <TimeSheetForm
                        initialDate={selectedDate}
                        initialEndHour={selectedEndHour}
                        initialEndMinute={selectedEndMinute}
                        initialMinute={selectedMinute}
                        initialHour={selectedHour}
                        editingEntry={editingEntry}
                        targetEmployeeId={targetEmployeeId}
                        onSaved={handleEntrySaved}
                        onCancel={closeEntryForm}
                      />
                    </section>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

    </div>
  );
};

export default App;