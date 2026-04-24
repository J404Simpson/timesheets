import { useEffect, useMemo, useState } from "react";
import Recent from "./Recent";
import ViewFooter from "./ViewFooter";
import { getTasksForProjectPhase, type Task } from "../api/task";
import { getDepartments, type Department } from "../api/department";
import {
  deactivateProject,
  deactivateProjectPhase,
  getAdminUsers,
  getPhasesForProject,
  getProjects,
  getWeekEntries,
  type AdminUser,
  type Phase,
  type Project,
  type WeekEntry,
} from "../api/timesheet";

type Props = {
  onEditEntryForUser?: (entry: WeekEntry, employeeId: number) => void;
  onCreateEntryForUser?: (employeeId: number) => void;
  onSelectDateForUser?: (
    employeeId: number,
    date: string,
    hour?: number,
    minute?: number,
    endHour?: number,
    endMinute?: number
  ) => void;
  onBackToRecent?: () => void;
  refreshToken?: number;
};

export default function Admin({
  onEditEntryForUser,
  onCreateEntryForUser,
  onSelectDateForUser,
  onBackToRecent,
  refreshToken,
}: Props): JSX.Element {
  const [activeSection, setActiveSection] = useState<"projects" | "sustaining" | "users">("users");
  const [projectView, setProjectView] = useState<"active" | "all">("active");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [phaseView, setPhaseView] = useState<"active" | "all">("active");
  const [selectedPhaseId, setSelectedPhaseId] = useState<number | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [taskDeptFilter, setTaskDeptFilter] = useState<number | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingPhases, setLoadingPhases] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [deactivatingProjectId, setDeactivatingProjectId] = useState<number | null>(null);
  const [deactivatingPhaseId, setDeactivatingPhaseId] = useState<number | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [phaseError, setPhaseError] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usersWeekOffset, setUsersWeekOffset] = useState(0);
  const [selectedUserWeekHours, setSelectedUserWeekHours] = useState<number | null>(null);

  const loadProjects = async (view: "active" | "all") => {
    setLoadingProjects(true);
    setProjectError(null);

    try {
      const includeInactive = view === "all";
      const projectData = await getProjects(includeInactive);
      setProjects(projectData);
      if (projectData.length === 0) {
        setSelectedProjectId(null);
      } else if (!selectedProjectId || !projectData.some((p) => p.id === selectedProjectId)) {
        setSelectedProjectId(projectData[0].id);
      }
    } catch {
      setProjectError("Failed to load projects.");
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    setError(null);

    try {
      const userData = await getAdminUsers();
      setUsers(userData);

      if (userData.length === 0) {
        setSelectedUserId(null);
      } else if (!selectedUserId || !userData.some((u) => u.id === selectedUserId)) {
        setSelectedUserId(userData[0].id);
      }
    } catch {
      setError("Failed to load users.");
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadPhasesForProject = async (projectId: number) => {
    setLoadingPhases(true);
    setPhaseError(null);

    try {
      const phaseData = await getPhasesForProject(projectId);
      setPhases(phaseData);
      setSelectedPhaseId((prev) => {
        if (phaseData.length === 0) return null;
        if (prev && phaseData.some((phase) => phase.id === prev)) return prev;
        return phaseData[0].id;
      });
    } catch {
      setPhases([]);
      setSelectedPhaseId(null);
      setPhaseError("Failed to load phases.");
    } finally {
      setLoadingPhases(false);
    }
  };

  const handleDeactivateProject = async (project: Project) => {
    if (project.active === false) return;
    const confirmed = window.confirm(`Set project \"${project.name}\" to inactive?`);
    if (!confirmed) return;

    setDeactivatingProjectId(project.id);
    setProjectError(null);

    try {
      await deactivateProject(project.id);
      await loadProjects(projectView);
    } catch {
      setProjectError("Failed to deactivate project.");
    } finally {
      setDeactivatingProjectId(null);
    }
  };

  const handleDeactivatePhase = async (phase: Phase) => {
    if (!selectedProjectId || phase.active === false) return;
    const confirmed = window.confirm(`Set phase \"${phase.name}\" to inactive?`);
    if (!confirmed) return;

    setDeactivatingPhaseId(phase.id);
    setPhaseError(null);

    try {
      await deactivateProjectPhase(selectedProjectId, phase.id);
      await loadPhasesForProject(selectedProjectId);
    } catch {
      setPhaseError("Failed to deactivate phase.");
    } finally {
      setDeactivatingPhaseId(null);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (activeSection !== "projects") return;
    loadProjects(projectView);
    if (departments.length === 0) {
      getDepartments().then(setDepartments).catch(() => {});
    }
  }, [activeSection, projectView]);

  useEffect(() => {
    if (activeSection !== "projects" || !selectedProjectId) {
      setPhases([]);
      setSelectedPhaseId(null);
      setPhaseError(null);
      return;
    }

    loadPhasesForProject(selectedProjectId);
  }, [activeSection, selectedProjectId]);

  useEffect(() => {
    if (activeSection !== "projects" || !selectedProjectId || !selectedPhaseId) {
      setTasks([]);
      setTaskError(null);
      return;
    }

    setLoadingTasks(true);
    setTaskError(null);

    getTasksForProjectPhase(selectedProjectId, selectedPhaseId)
      .then((taskData) => {
        setTasks(taskData);
      })
      .catch(() => {
        setTasks([]);
        setTaskError("Failed to load tasks.");
      })
      .finally(() => {
        setLoadingTasks(false);
      });
  }, [activeSection, selectedProjectId, selectedPhaseId]);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) ?? null,
    [users, selectedUserId]
  );
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  const getUserDisplayName = (user: AdminUser) => {
    const name = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
    return name || user.email;
  };

  const toDateKeyLocal = (value: Date) => {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  useEffect(() => {
    if (activeSection !== "users" || !selectedUser) {
      setSelectedUserWeekHours(null);
      return;
    }

    let weekOf: string | undefined;
    if (usersWeekOffset !== 0) {
      const ref = new Date();
      ref.setDate(ref.getDate() + usersWeekOffset * 7);
      weekOf = toDateKeyLocal(ref);
    }

    getWeekEntries(weekOf, selectedUser.id)
      .then((entries) => {
        const total = entries.reduce((sum, entry) => sum + Number(entry.hours), 0);
        setSelectedUserWeekHours(total);
      })
      .catch(() => {
        setSelectedUserWeekHours(null);
      });
  }, [activeSection, selectedUser, usersWeekOffset, refreshToken]);

  const selectedUserHoursLabel =
    selectedUserWeekHours === null ? "" : `Total ${parseFloat(selectedUserWeekHours.toFixed(2))}hrs`;

  return (
    <section className="admin-view" aria-live="polite">
      <div className="admin-panel">
        <div className="admin-options-bar">
          <div className="admin-options" role="tablist" aria-label="Admin sections">
            <button
              type="button"
              className={`btn admin-option ${activeSection === "users" ? "is-active" : ""}`}
              onClick={() => setActiveSection("users")}
            >
              Users
            </button>
            <button
              type="button"
              className={`btn admin-option ${activeSection === "projects" ? "is-active" : ""}`}
              onClick={() => setActiveSection("projects")}
            >
              Projects
            </button>
            <button
              type="button"
              className={`btn admin-option ${activeSection === "sustaining" ? "is-active" : ""}`}
              onClick={() => setActiveSection("sustaining")}
            >
              Sustaining
            </button>
          </div>

          <div className="admin-options-center">
            {activeSection === "users" && selectedUser && (
              <span className="admin-selected-user-meta">
                <span className="admin-selected-user-label">{getUserDisplayName(selectedUser)}</span>
                {selectedUserHoursLabel && (
                  <span className="admin-selected-user-hours">{selectedUserHoursLabel}</span>
                )}
              </span>
            )}
          </div>

          <div className="admin-options-end" />
        </div>

        <div className="admin-content">
          {activeSection === "projects" && (
            <div className="admin-projects-layout">
              <aside className="admin-users-list-panel">
                <div className="admin-users-list-header">
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <h3 style={{ margin: 0 }}>Projects</h3>
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() => setProjectView((prev) => (prev === "active" ? "all" : "active"))}
                      disabled={loadingProjects}
                    >
                      {projectView === "active" ? "Active" : "All"}
                    </button>
                  </div>
                </div>

                {projectError && <p className="admin-error">{projectError}</p>}

                {loadingProjects ? (
                  <p className="muted">Loading projects...</p>
                ) : projects.length === 0 ? (
                  <p className="muted">No projects found.</p>
                ) : (
                  <ul className="admin-user-list">
                    {projects
                      .filter((p) => ![1, 2, 3].includes(p.id))
                      .map((project) => (
                      <li key={project.id}>
                        <div className={`admin-user-item admin-record-item ${selectedProjectId === project.id ? "is-active" : ""}`}>
                          <button
                            type="button"
                            className="admin-record-select"
                            onClick={() => setSelectedProjectId(project.id)}
                          >
                            <span className="admin-user-name">{project.name}</span>
                          </button>

                          {project.active !== false ? (
                            <button
                              type="button"
                              className="btn secondary admin-record-status-btn"
                              onClick={() => handleDeactivateProject(project)}
                              disabled={deactivatingProjectId === project.id}
                              title="Set inactive"
                            >
                              {deactivatingProjectId === project.id ? "Saving..." : "Active"}
                            </button>
                          ) : (
                            <span className="admin-user-email muted">Inactive</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </aside>

              <section className="admin-users-recent-panel admin-phase-panel">
                <div className="admin-users-list-header">
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <h3 style={{ margin: 0 }}>Phases</h3>
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() => setPhaseView((prev) => (prev === "active" ? "all" : "active"))}
                      disabled={loadingPhases}
                    >
                      {phaseView === "active" ? "Active" : "All"}
                    </button>
                  </div>
                </div>

                {phaseError && <p className="admin-error">{phaseError}</p>}

                {!selectedProject ? (
                  <p className="muted">Select a project to view phases.</p>
                ) : loadingPhases ? (
                  <p className="muted">Loading phases...</p>
                ) : phases.length === 0 ? (
                  <p className="muted">No phases found for {selectedProject.name}.</p>
                ) : (
                  <ul className="admin-user-list">
                    {phases
                      .filter((phase) => phaseView === "all" || phase.active !== false)
                      .map((phase) => (
                        <li key={phase.id}>
                          <div className={`admin-user-item admin-record-item ${selectedPhaseId === phase.id ? "is-active" : ""}`}>
                            <button
                              type="button"
                              className="admin-record-select"
                              onClick={() => setSelectedPhaseId(phase.id)}
                            >
                              <span className="admin-user-name">{phase.name}</span>
                            </button>

                            {phase.active !== false ? (
                              <button
                                type="button"
                                className="btn secondary admin-record-status-btn"
                                onClick={() => handleDeactivatePhase(phase)}
                                disabled={deactivatingPhaseId === phase.id}
                                title="Set inactive"
                              >
                                {deactivatingPhaseId === phase.id ? "Saving..." : "Active"}
                              </button>
                            ) : (
                              <span className="admin-user-email muted">Inactive</span>
                            )}
                          </div>
                        </li>
                      ))}
                  </ul>
                )}
              </section>

              <section className="admin-users-recent-panel admin-task-panel">
                <div className="admin-users-list-header">
                  <h3>Tasks</h3>
                  {departments.length > 0 && (
                    <select
                      className="admin-dept-filter"
                      value={taskDeptFilter ?? ""}
                      onChange={(e) => setTaskDeptFilter(e.target.value === "" ? null : Number(e.target.value))}
                    >
                      <option value="">All Departments</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                {taskError && <p className="admin-error">{taskError}</p>}

                {!selectedProject ? (
                  <p className="muted">Select a project to view tasks.</p>
                ) : !selectedPhaseId ? (
                  <p className="muted">Select a phase to view tasks.</p>
                ) : loadingTasks ? (
                  <p className="muted">Loading tasks...</p>
                ) : tasks.length === 0 ? (
                  <p className="muted">No tasks found for this phase.</p>
                ) : (
                  <ul className="admin-user-list">
                    {tasks
                      .filter((task) => taskDeptFilter === null || task.department_id === taskDeptFilter)
                      .map((task) => (
                        <li key={task.id}>
                          <div className="admin-user-item">
                            <span className="admin-user-name">{task.name}</span>
                          </div>
                        </li>
                      ))}
                  </ul>
                )}
              </section>
            </div>
          )}

          {activeSection === "sustaining" && <p className="muted">Sustaining configuration coming next.</p>}

          {activeSection === "users" && (
            <div className="admin-users-layout">
              <aside className="admin-users-list-panel">
                <div className="admin-users-list-header">
                  <h3>Users</h3>
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={loadUsers}
                    disabled={loadingUsers}
                  >
                    {loadingUsers ? "Refreshing..." : "Refresh"}
                  </button>
                </div>

                {error && <p className="admin-error">{error}</p>}

                {loadingUsers ? (
                  <p className="muted">Loading users...</p>
                ) : users.length === 0 ? (
                  <p className="muted">No non-admin users found.</p>
                ) : (
                  <ul className="admin-user-list">
                    {users.map((user) => {
                      const selected = user.id === selectedUserId;
                      return (
                        <li key={user.id}>
                          <button
                            type="button"
                            className={`admin-user-item ${selected ? "is-active" : ""}`}
                            onClick={() => setSelectedUserId(user.id)}
                          >
                            <span className="admin-user-name">{getUserDisplayName(user)}</span>
                            <span className="admin-user-email muted">{user.email}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </aside>

              <section className="admin-users-recent-panel">
                {selectedUser ? (
                  <>
                    <Recent
                      employeeId={selectedUser.id}
                      showCreateButton
                      hideFooter
                      weekOffset={usersWeekOffset}
                      onWeekOffsetChange={setUsersWeekOffset}
                      refreshToken={refreshToken}
                      allowPreviousWeekEdits
                      onCreateEntry={() => onCreateEntryForUser?.(selectedUser.id)}
                      onSelectDate={(date, hour, minute, endHour, endMinute) =>
                        onSelectDateForUser?.(selectedUser.id, date, hour, minute, endHour, endMinute)
                      }
                      onEditEntry={(entry) => onEditEntryForUser?.(entry, selectedUser.id)}
                    />
                  </>
                ) : (
                  <p className="muted">Select a user to view recent entries.</p>
                )}
              </section>
            </div>
          )}
        </div>
      </div>

      <ViewFooter
        startContent={
          activeSection === "users" ? (
            <button
              type="button"
              className="btn week-nav-toggle"
              onClick={() => setUsersWeekOffset(usersWeekOffset === 0 ? -1 : 0)}
              title={usersWeekOffset === 0 ? "View last week" : "Back to this week"}
              aria-label={usersWeekOffset === 0 ? "View last week" : "Back to this week"}
            >
              <span>{usersWeekOffset === 0 ? "Last Week" : "This Week"}</span>
              <span aria-hidden="true">{usersWeekOffset === 0 ? "←" : "→"}</span>
            </button>
          ) : undefined
        }
        centerContent={
          activeSection === "users" ? (
            <button
              type="button"
              className="btn primary week-nav-create"
              onClick={() => selectedUser && onCreateEntryForUser?.(selectedUser.id)}
              disabled={!selectedUser}
            >
              New Entry
            </button>
          ) : undefined
        }
        endContent={
          <button
            type="button"
            className="btn week-nav-toggle week-nav-admin"
            onClick={onBackToRecent}
            aria-label="Back to recent view"
          >
            Back
          </button>
        }
      />
    </section>
  );
}
