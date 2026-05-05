import { useEffect, useMemo, useState } from "react";
// Reusable confirmation modal
function ConfirmModal({ open, title, message, onConfirm, onCancel, confirmLabel = "Confirm", cancelLabel = "Cancel", loading }: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">{title}</h3>
        <p style={{ marginBottom: 24 }}>{message}</p>
        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={onCancel} disabled={loading}>{cancelLabel}</button>
          <button type="button" className="btn primary" onClick={onConfirm} disabled={loading}>{loading ? "Saving..." : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
import Recent from "./Recent";
import ViewFooter from "./ViewFooter";
import { getTasksForProjectPhase, getTasksForProjectPhaseWithInactive, deactivateTask, getAllTasks, updateTaskEnabled, updateTaskActive, createTask, createSustainingTask, type Task } from "../api/task";
import { getDepartments, type Department } from "../api/department";
import {
  createProject,
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
  const [sustainingTasks, setSustainingTasks] = useState<Task[]>([]);
  const [sustainingView, setSustainingView] = useState<"active" | "inactive">("active");
  const [loadingSustainingTasks, setLoadingSustainingTasks] = useState(false);
  const [selectedSustainingTaskId, setSelectedSustainingTaskId] = useState<number | null>(null);
  const [sustainingDeptFilter, setSustainingDeptFilter] = useState<number | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [taskDeptFilter, setTaskDeptFilter] = useState<number | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingPhases, setLoadingPhases] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [deactivatingProjectId, setDeactivatingProjectId] = useState<number | null>(null);
  const [deactivatingPhaseId, setDeactivatingPhaseId] = useState<number | null>(null);
  const [deactivatingTaskId, setDeactivatingTaskId] = useState<number | null>(null);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    type: "project" | "phase" | "task" | "edit-task-status" | null;
    id: number | null;
    name: string;
  }>({ type: null, id: null, name: "" });
  const [newProjectName, setNewProjectName] = useState("");
  const [savingProject, setSavingProject] = useState(false);
  const [newProjectError, setNewProjectError] = useState<string | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [phaseError, setPhaseError] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [showEditTasksView, setShowEditTasksView] = useState(false);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loadingAllTasks, setLoadingAllTasks] = useState(false);
  const [allTasksError, setAllTasksError] = useState<string | null>(null);
  const [selectedEditTaskId, setSelectedEditTaskId] = useState<number | null>(null);
  const [editTaskDeptFilter, setEditTaskDeptFilter] = useState<number | null>(null);
  const [editTaskPhaseFilter, setEditTaskPhaseFilter] = useState<number | null>(null);
  const [editTaskActiveFilter, setEditTaskActiveFilter] = useState<"active" | "inactive">("active");
  const [savingTaskEnabledId, setSavingTaskEnabledId] = useState<number | null>(null);
  const [savingTaskActiveId, setSavingTaskActiveId] = useState<number | null>(null);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskDepartmentId, setNewTaskDepartmentId] = useState<number | null>(null);
  const [newTaskPhaseId, setNewTaskPhaseId] = useState<number | null>(null);
  const [newTaskEnabled, setNewTaskEnabled] = useState<boolean | null>(null);
  const [savingNewTask, setSavingNewTask] = useState(false);
  const [newTaskError, setNewTaskError] = useState<string | null>(null);
  const [showNewSustainingTaskModal, setShowNewSustainingTaskModal] = useState(false);
  const [newSustainingTaskName, setNewSustainingTaskName] = useState("");
  const [newSustainingTaskDeptIds, setNewSustainingTaskDeptIds] = useState<number[]>([]);
  const [newSustainingTaskError, setNewSustainingTaskError] = useState<string | null>(null);
  const [savingNewSustainingTask, setSavingNewSustainingTask] = useState(false);
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

  const handleDeactivateProject = (project: Project) => {
    if (project.active === false) return;
    setConfirmModal({ type: "project", id: project.id, name: project.name });
  };

  const confirmDeactivateProject = async () => {
    if (!confirmModal.id) return;
    setDeactivatingProjectId(confirmModal.id);
    setProjectError(null);
    try {
      await deactivateProject(confirmModal.id);
      await loadProjects(projectView);
    } catch {
      setProjectError("Failed to deactivate project.");
    } finally {
      setDeactivatingProjectId(null);
      setConfirmModal({ type: null, id: null, name: "" });
    }
  };

  const handleDeactivatePhase = (phase: Phase) => {
    if (!selectedProjectId || phase.active === false) return;
    setConfirmModal({ type: "phase", id: phase.id, name: phase.name });
  };

  const confirmDeactivatePhase = async () => {
    if (!selectedProjectId || !confirmModal.id) return;
    setDeactivatingPhaseId(confirmModal.id);
    setPhaseError(null);
    try {
      await deactivateProjectPhase(selectedProjectId, confirmModal.id);
      await loadPhasesForProject(selectedProjectId);
    } catch {
      setPhaseError("Failed to deactivate phase.");
    } finally {
      setDeactivatingPhaseId(null);
      setConfirmModal({ type: null, id: null, name: "" });
    }
  };

  const handleDeactivateTask = (task: Task) => {
    if (task.active === false) return;
    setConfirmModal({ type: "task", id: task.id, name: task.name });
  };

  const confirmDeactivateTask = async () => {
    if (!confirmModal.id) return;
    setDeactivatingTaskId(confirmModal.id);
    try {
      await deactivateTask(confirmModal.id);
      await loadSustainingTasks(sustainingView);
    } finally {
      setDeactivatingTaskId(null);
      setConfirmModal({ type: null, id: null, name: "" });
    }
  };
    // ...existing code...

    // Confirmation modal for deactivation
    const showConfirm = confirmModal.type !== null;
    let confirmTitle = "";
    let confirmMessage = "";
    let confirmLoading = false;
    let confirmAction = () => {};
    if (confirmModal.type === "project") {
      confirmTitle = "Set Project Inactive";
      confirmMessage = `Are you sure you want to set project "${confirmModal.name}" to inactive?`;
      confirmLoading = deactivatingProjectId === confirmModal.id;
      confirmAction = confirmDeactivateProject;
    } else if (confirmModal.type === "phase") {
      confirmTitle = "Set Phase Inactive";
      confirmMessage = `Are you sure you want to set phase "${confirmModal.name}" to inactive?`;
      confirmLoading = deactivatingPhaseId === confirmModal.id;
      confirmAction = confirmDeactivatePhase;
    } else if (confirmModal.type === "task") {
      confirmTitle = "Set Task Inactive";
      confirmMessage = `Are you sure you want to set task "${confirmModal.name}" to inactive?`;
      confirmLoading = deactivatingTaskId === confirmModal.id;
      confirmAction = confirmDeactivateTask;
    } else if (confirmModal.type === "edit-task-status") {
      confirmTitle = "Set Task Inactive";
      confirmMessage = `Are you sure you want to set task "${confirmModal.name}" to inactive?`;
      confirmLoading = savingTaskActiveId === confirmModal.id;
      confirmAction = async () => {
        if (!confirmModal.id) return;
        await handleSetEditTaskActive(false, confirmModal.id);
        setConfirmModal({ type: null, id: null, name: "" });
      };
    }
  const handleSaveNewProject = async () => {
    const trimmed = newProjectName.trim();
    if (!trimmed) {
      setNewProjectError("Project name is required.");
      return;
    }
    setSavingProject(true);
    setNewProjectError(null);
    try {
      const project = await createProject(trimmed);
      setShowNewProjectModal(false);
      setNewProjectName("");
      await loadProjects(projectView);
      setSelectedProjectId(project.id);
    } catch {
      setNewProjectError("Failed to create project. Please try again.");
    } finally {
      setSavingProject(false);
    }
  };

  const handleSaveNewTask = async () => {
    const trimmed = newTaskName.trim();
    if (!trimmed) {
      setNewTaskError("Task name is required.");
      return;
    }
    if (!newTaskDepartmentId) {
      setNewTaskError("Department is required.");
      return;
    }
    if (!newTaskPhaseId) {
      setNewTaskError("Phase is required.");
      return;
    }
    if (newTaskEnabled === null) {
      setNewTaskError("Claimable selection is required.");
      return;
    }
    setSavingNewTask(true);
    setNewTaskError(null);
    try {
      const task = await createTask(trimmed, newTaskDepartmentId, newTaskPhaseId, newTaskEnabled);
      setShowNewTaskModal(false);
      setNewTaskName("");
      setNewTaskDepartmentId(null);
      setNewTaskPhaseId(null);
      setNewTaskEnabled(null);
      await loadAllTasks();
      setSelectedEditTaskId(task.id);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to create task. Please try again.";
      setNewTaskError(errorMsg);
    } finally {
      setSavingNewTask(false);
    }
  };

  const handleSaveNewSustainingTask = async () => {
    const trimmed = newSustainingTaskName.trim();
    if (!trimmed) {
      setNewSustainingTaskError("Task name is required.");
      return;
    }
    if (newSustainingTaskDeptIds.length === 0) {
      setNewSustainingTaskError("At least one department is required.");
      return;
    }
    setSavingNewSustainingTask(true);
    setNewSustainingTaskError(null);
    try {
      await createSustainingTask(trimmed, newSustainingTaskDeptIds, false);
      setShowNewSustainingTaskModal(false);
      setNewSustainingTaskName("");
      setNewSustainingTaskDeptIds([]);
      await loadSustainingTasks(sustainingView);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to create task. Please try again.";
      setNewSustainingTaskError(errorMsg);
    } finally {
      setSavingNewSustainingTask(false);
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
    if (activeSection !== "projects") {
      setShowEditTasksView(false);
    }
  }, [activeSection]);

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

  // Sustaining constants (matches TimeSheetForm: project 3, phase 1)
  const SUSTAINING_PROJECT_ID = 3;
  const SUSTAINING_PHASE_ID = 1;

  const loadSustainingTasks = async (view: "active" | "inactive") => {
    setLoadingSustainingTasks(true);
    try {
      const includeInactive = view === "inactive";
      const fetched = await getTasksForProjectPhaseWithInactive(SUSTAINING_PROJECT_ID, SUSTAINING_PHASE_ID, includeInactive);
      setSustainingTasks(fetched);
      if (fetched.length === 0) {
        setSelectedSustainingTaskId(null);
      } else if (!selectedSustainingTaskId || !fetched.some((t) => t.id === selectedSustainingTaskId)) {
        const pick = fetched.find((t) => (view === "active" ? t.active : !t.active)) ?? fetched[0];
        setSelectedSustainingTaskId(pick.id);
      }
    } catch {
      setSustainingTasks([]);
      setSelectedSustainingTaskId(null);
    } finally {
      setLoadingSustainingTasks(false);
    }
  };

  useEffect(() => {
    if (activeSection !== "sustaining") return;
    loadSustainingTasks(sustainingView);
    if (departments.length === 0) {
      getDepartments().then(setDepartments).catch(() => {});
    }
  }, [activeSection, sustainingView]);

  const loadAllTasks = async () => {
    setLoadingAllTasks(true);
    setAllTasksError(null);
    try {
      const fetched = await getAllTasks(true);
      setAllTasks(fetched);
      const projectTasks = fetched.filter((task) => task.task_type === "PROJECT");
      if (projectTasks.length === 0) {
        setSelectedEditTaskId(null);
      } else if (!selectedEditTaskId || !projectTasks.some((task) => task.id === selectedEditTaskId)) {
        setSelectedEditTaskId(projectTasks[0].id);
      }
    } catch {
      setAllTasks([]);
      setSelectedEditTaskId(null);
      setAllTasksError("Failed to load all tasks.");
    } finally {
      setLoadingAllTasks(false);
    }
  };

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) ?? null,
    [users, selectedUserId]
  );
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );
  const selectedEditTask = useMemo(
    () => allTasks.find((task) => task.id === selectedEditTaskId) ?? null,
    [allTasks, selectedEditTaskId]
  );

  const projectEditTasks = useMemo(
    () => allTasks.filter((task) => task.task_type === "PROJECT"),
    [allTasks]
  );

  const editTaskPhaseOptions = useMemo(() => {
    const phaseMap = new Map<number, string>();
    for (const task of projectEditTasks) {
      if (editTaskDeptFilter !== null && task.department_id !== editTaskDeptFilter) continue;
      if (editTaskActiveFilter === "active" && task.active === false) continue;
      if (editTaskActiveFilter === "inactive" && task.active !== false) continue;
      for (const phase of task.phases ?? []) {
        phaseMap.set(phase.id, phase.name);
      }
    }
    return Array.from(phaseMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [projectEditTasks, editTaskDeptFilter, editTaskActiveFilter]);

  const allAvailablePhases = useMemo(() => {
    const phaseMap = new Map<number, string>();
    for (const task of projectEditTasks) {
      for (const phase of task.phases ?? []) {
        phaseMap.set(phase.id, phase.name);
      }
    }
    return Array.from(phaseMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [projectEditTasks]);

  const filteredEditTasks = useMemo(() => {
    return projectEditTasks
      .filter((task) => editTaskDeptFilter === null || task.department_id === editTaskDeptFilter)
      .filter((task) => {
        if (editTaskActiveFilter === "active") return task.active !== false;
        return task.active === false;
      })
      .filter((task) => editTaskPhaseFilter === null || (task.phases ?? []).some((phase) => phase.id === editTaskPhaseFilter));
  }, [projectEditTasks, editTaskDeptFilter, editTaskActiveFilter, editTaskPhaseFilter]);

  useEffect(() => {
    if (filteredEditTasks.length === 0) {
      setSelectedEditTaskId(null);
      return;
    }
    if (!selectedEditTaskId || !filteredEditTasks.some((task) => task.id === selectedEditTaskId)) {
      setSelectedEditTaskId(filteredEditTasks[0].id);
    }
  }, [filteredEditTasks, selectedEditTaskId]);

  const getDepartmentName = (departmentId?: number | null) => {
    if (!departmentId) return "No department";
    return departments.find((department) => department.id === departmentId)?.name ?? "No department";
  };

  const handleToggleEditTaskEnabled = async () => {
    if (!selectedEditTask) return;
    setSavingTaskEnabledId(selectedEditTask.id);
    setAllTasksError(null);
    try {
      const updatedTask = await updateTaskEnabled(selectedEditTask.id, !selectedEditTask.enabled);
      setAllTasks((prev) => prev.map((task) => (task.id === updatedTask.id ? { ...task, enabled: updatedTask.enabled } : task)));
    } catch {
      setAllTasksError("Failed to update task enabled state.");
    } finally {
      setSavingTaskEnabledId(null);
    }
  };

  const handleSetEditTaskActive = async (active: boolean, taskIdOverride?: number) => {
    const taskId = taskIdOverride ?? selectedEditTask?.id;
    if (!taskId) return;
    setSavingTaskActiveId(taskId);
    setAllTasksError(null);
    try {
      const updatedTask = await updateTaskActive(taskId, active);
      setAllTasks((prev) => prev.map((task) => (
        task.id === updatedTask.id
          ? { ...task, active: updatedTask.active }
          : task
      )));
    } catch {
      setAllTasksError("Failed to update task active state.");
    } finally {
      setSavingTaskActiveId(null);
    }
  };

  const handleEditTaskStatusToggle = () => {
    if (!selectedEditTask) return;
    if (selectedEditTask.active) {
      setConfirmModal({ type: "edit-task-status", id: selectedEditTask.id, name: selectedEditTask.name });
      return;
    }
    void handleSetEditTaskActive(true);
  };

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
          {activeSection === "projects" && !showEditTasksView && (
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ margin: 0 }}>Tasks</h3>
                    {departments.length > 0 && (
                      <select
                        className="admin-dept-filter admin-record-status-btn"
                        style={{ minHeight: 32, borderRadius: 8, padding: '0 12px', fontSize: 14 }}
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
                          <div className="admin-user-item admin-record-item">
                            <span className="admin-user-name">{task.name}</span>
                            <span
                              className={`admin-enabled-indicator ${task.enabled ? "is-enabled" : ""}`}
                              title={task.enabled ? 'Enabled' : 'Disabled'}
                            />
                          </div>
                        </li>
                      ))}
                  </ul>
                )}
              </section>
            </div>
          )}

          {activeSection === "projects" && showEditTasksView && (
            <div className="admin-edit-tasks-layout">
              <aside className="admin-users-list-panel">
                <div className="admin-users-list-header">
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <h3 style={{ margin: 0 }}>Tasks</h3>
                    {departments.length > 0 && (
                      <select
                        className="admin-dept-filter admin-record-status-btn"
                        style={{ minHeight: 32, borderRadius: 8, padding: "0 12px", fontSize: 14 }}
                        value={editTaskDeptFilter ?? ""}
                        onChange={(e) => {
                          setEditTaskDeptFilter(e.target.value === "" ? null : Number(e.target.value));
                          setEditTaskPhaseFilter(null);
                        }}
                      >
                        <option value="">All Departments</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    )}
                    <select
                      className="admin-dept-filter admin-record-status-btn"
                      style={{ minHeight: 32, borderRadius: 8, padding: "0 12px", fontSize: 14 }}
                      value={editTaskPhaseFilter ?? ""}
                      onChange={(e) => setEditTaskPhaseFilter(e.target.value === "" ? null : Number(e.target.value))}
                    >
                      <option value="">All Phases</option>
                      {editTaskPhaseOptions.map((phase) => (
                        <option key={phase.id} value={phase.id}>{phase.name}</option>
                      ))}
                    </select>
                    <select
                      className="admin-dept-filter admin-record-status-btn"
                      style={{ minHeight: 32, borderRadius: 8, padding: "0 12px", fontSize: 14 }}
                      value={editTaskActiveFilter}
                      onChange={(e) => setEditTaskActiveFilter(e.target.value as "active" | "inactive")}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {allTasksError && <p className="admin-error">{allTasksError}</p>}

                {loadingAllTasks ? (
                  <p className="muted">Loading all tasks...</p>
                ) : allTasks.length === 0 ? (
                  <p className="muted">No tasks found.</p>
                ) : filteredEditTasks.length === 0 ? (
                  <p className="muted">No tasks match the selected filters.</p>
                ) : (
                  <ul className="admin-user-list">
                    {filteredEditTasks.map((task) => (
                        <li key={task.id}>
                          <div className={`admin-user-item admin-record-item ${selectedEditTaskId === task.id ? "is-active" : ""}`}>
                            <button
                              type="button"
                              className="admin-record-select"
                              onClick={() => setSelectedEditTaskId(task.id)}
                            >
                              <span className="admin-user-name">{task.name}</span>
                            </button>
                            <span
                              className={`admin-enabled-indicator ${task.enabled ? "is-enabled" : ""}`}
                              title={task.enabled ? "Enabled" : "Disabled"}
                            />
                          </div>
                        </li>
                      ))}
                  </ul>
                )}
              </aside>

              <section className="admin-users-recent-panel">
                <div className="admin-users-list-header">
                  <h3>Details</h3>
                </div>
                {selectedEditTask ? (
                  <div className="admin-task-detail">
                    <div className="admin-task-detail-body">
                      <p className="admin-detail-label">Department</p>
                      <div className="admin-detail-box">
                        {getDepartmentName(selectedEditTask.department_id)}
                      </div>

                      <p className="admin-detail-label">Phase</p>
                      <div className="admin-detail-box">
                        {selectedEditTask.phases && selectedEditTask.phases.length > 0
                          ? selectedEditTask.phases.map((ph) => ph.name).join(", ")
                          : <span className="muted">No phase assigned</span>}
                      </div>

                      <p className="admin-detail-label">Status</p>
                      <div style={{ paddingTop: 0 }}>
                        <button
                          type="button"
                          className="btn secondary admin-record-status-btn"
                          onClick={handleEditTaskStatusToggle}
                          disabled={savingTaskActiveId === selectedEditTask.id}
                        >
                          {savingTaskActiveId === selectedEditTask.id
                            ? "Saving..."
                            : selectedEditTask.active
                              ? "Active"
                              : "Inactive"}
                        </button>
                      </div>
                    </div>

                    <div className="admin-task-claimable-btns">
                      <button
                        type="button"
                        className={`btn admin-claimable-btn ${selectedEditTask.enabled ? "is-selected" : ""}`}
                        onClick={() => !selectedEditTask.enabled && handleToggleEditTaskEnabled()}
                        disabled={savingTaskEnabledId === selectedEditTask.id || selectedEditTask.enabled}
                      >
                        Claimable
                      </button>
                      <button
                        type="button"
                        className={`btn admin-claimable-btn ${!selectedEditTask.enabled ? "is-selected" : ""}`}
                        onClick={() => selectedEditTask.enabled && handleToggleEditTaskEnabled()}
                        disabled={savingTaskEnabledId === selectedEditTask.id || !selectedEditTask.enabled}
                      >
                        Un-Claimable
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="muted">Select a task to view details.</p>
                )}
              </section>
            </div>
          )}

          {activeSection === "sustaining" && (
            <div className="admin-edit-tasks-layout">
              <aside className="admin-users-list-panel">
                <div className="admin-users-list-header">
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <h3 style={{ margin: 0 }}>Tasks</h3>
                    {departments.length > 0 && (
                      <select
                        className="admin-dept-filter admin-record-status-btn"
                        style={{ minHeight: 32, borderRadius: 8, padding: "0 12px", fontSize: 14 }}
                        value={sustainingDeptFilter ?? ""}
                        onChange={(e) => setSustainingDeptFilter(e.target.value === "" ? null : Number(e.target.value))}
                      >
                        <option value="">All Departments</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    )}
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() => setSustainingView((prev) => (prev === "active" ? "inactive" : "active"))}
                      disabled={loadingSustainingTasks}
                    >
                      {sustainingView === "active" ? "Active" : "Inactive"}
                    </button>
                  </div>
                </div>

                {loadingSustainingTasks ? (
                  <p className="muted">Loading sustaining tasks...</p>
                ) : (() => {
                  const filtered = sustainingTasks
                    .filter((t) => (sustainingView === "active" ? t.active : !t.active))
                    .filter((t) => sustainingDeptFilter === null || (t.departments ?? []).some((d) => d.id === sustainingDeptFilter));

                  return filtered.length === 0 ? (
                    <p className="muted">No sustaining tasks found.</p>
                  ) : (
                    <ul className="admin-user-list">
                      {filtered.map((taskItem) => (
                        <li key={taskItem.id}>
                          <div className={`admin-user-item admin-record-item ${selectedSustainingTaskId === taskItem.id ? "is-active" : ""}`}>
                            <button
                              type="button"
                              className="admin-record-select"
                              onClick={() => setSelectedSustainingTaskId(taskItem.id)}
                            >
                              <span className="admin-user-name">{taskItem.name}</span>
                            </button>

                            {taskItem.active !== false ? (
                              <button
                                type="button"
                                className="btn secondary admin-record-status-btn"
                                onClick={() => handleDeactivateTask(taskItem)}
                                title="Set inactive"
                                disabled={deactivatingTaskId === taskItem.id}
                              >
                                {deactivatingTaskId === taskItem.id ? "Saving..." : "Active"}
                              </button>
                            ) : (
                              <span className="admin-user-email muted">Inactive</span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </aside>

              <section className="admin-users-recent-panel">
                <div className="admin-users-list-header">
                  <h3>Details</h3>
                </div>
                {(() => {
                  const selectedSustainingTask = sustainingTasks.find((t) => t.id === selectedSustainingTaskId);
                  return selectedSustainingTask ? (
                    <div className="admin-task-detail">
                      <div className="admin-task-detail-body">
                        <p className="admin-detail-label">Departments</p>
                        <div className="admin-detail-box">
                          {selectedSustainingTask.departments && selectedSustainingTask.departments.length > 0
                            ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: 2, width: "100%" }}>
                                {selectedSustainingTask.departments.map((d) => (
                                  <div key={d.id}>{d.name}</div>
                                ))}
                              </div>
                            )
                            : <span className="muted">No department assigned</span>}
                        </div>

                        <p className="admin-detail-label">Status</p>
                        <div style={{ paddingTop: 0 }}>
                          <button
                            type="button"
                            className="btn secondary admin-record-status-btn"
                            onClick={() => handleDeactivateTask(selectedSustainingTask)}
                            disabled={deactivatingTaskId === selectedSustainingTask.id || !selectedSustainingTask.active}
                          >
                            {deactivatingTaskId === selectedSustainingTask.id ? "Saving..." : selectedSustainingTask.active ? "Active" : "Inactive"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="muted">Select a sustaining task to view details.</p>
                  );
                })()}
              </section>
            </div>
          )}

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
          ) : activeSection === "projects" ? (
            <button
              type="button"
              className="btn week-nav-toggle"
              onClick={async () => {
                if (showEditTasksView) {
                  setShowEditTasksView(false);
                  return;
                }
                setShowEditTasksView(true);
                await loadAllTasks();
              }}
            >
              {showEditTasksView ? "Back to Projects" : "Edit Tasks"}
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
          ) : activeSection === "projects" ? (
            <button
              type="button"
              className="btn primary week-nav-create"
              onClick={() => {
                if (showEditTasksView) {
                  setNewTaskName("");
                  setNewTaskDepartmentId(null);
                  setNewTaskPhaseId(null);
                  setNewTaskEnabled(null);
                  setNewTaskError(null);
                  setShowNewTaskModal(true);
                } else {
                  setNewProjectName("");
                  setNewProjectError(null);
                  setShowNewProjectModal(true);
                }
              }}
            >
              {showEditTasksView ? "New Task" : "New Project"}
            </button>
          ) : activeSection === "sustaining" ? (
            <button
              type="button"
              className="btn primary week-nav-create"
              onClick={() => {
                setNewSustainingTaskName("");
                setNewSustainingTaskDeptIds([]);
                setNewSustainingTaskError(null);
                setShowNewSustainingTaskModal(true);
              }}
            >
              New Task
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

      {showNewProjectModal && (
        <div className="modal-overlay" onClick={() => setShowNewProjectModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title" style={{ textAlign: 'center' }}>New Project</h3>
            <input
              id="new-project-name"
              className="modal-input"
              type="text"
              placeholder="Enter project name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveNewProject()}
              autoFocus
              disabled={savingProject}
            />
            {newProjectError && <p className="modal-error">{newProjectError}</p>}
            <div className="modal-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={() => setShowNewProjectModal(false)}
                disabled={savingProject}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={handleSaveNewProject}
                disabled={savingProject || !newProjectName.trim()}
              >
                {savingProject ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewTaskModal && (
        <div className="modal-overlay" onClick={() => setShowNewTaskModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title" style={{ textAlign: 'center' }}>New Task</h3>
            <input
              id="new-task-name"
              className="modal-input new-task-name-input"
              style={{ marginTop: 2 }}
              type="text"
              placeholder="Enter task name"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveNewTask()}
              autoFocus
              disabled={savingNewTask}
            />

            <div style={{ display: "flex", flexDirection: "column" }}>
            <p className="admin-detail-label">Department</p>
            <select
              className="admin-dept-filter admin-record-status-btn"
              style={{ minHeight: 32, borderRadius: 8, padding: "0 12px", fontSize: 14, width: "100%" }}
              value={newTaskDepartmentId ?? ""}
              onChange={(e) => setNewTaskDepartmentId(e.target.value === "" ? null : Number(e.target.value))}
              disabled={savingNewTask}
            >
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>

            <p className="admin-detail-label">Phase</p>
            <select
              className="admin-dept-filter admin-record-status-btn"
              style={{ minHeight: 32, borderRadius: 8, padding: "0 12px", fontSize: 14, width: "100%" }}
              value={newTaskPhaseId ?? ""}
              onChange={(e) => setNewTaskPhaseId(e.target.value === "" ? null : Number(e.target.value))}
              disabled={savingNewTask}
            >
              <option value="">Select Phase</option>
              {allAvailablePhases.map((phase) => (
                <option key={phase.id} value={phase.id}>{phase.name}</option>
              ))}
            </select>

            <p className="admin-detail-label">Claimable</p>
            <div className="admin-task-claimable-btns new-task-claimable-btns">
              <button
                type="button"
                className={`btn admin-claimable-btn ${newTaskEnabled === true ? "is-selected" : ""}`}
                onClick={() => setNewTaskEnabled(true)}
                disabled={savingNewTask}
              >
                Claimable
              </button>
              <button
                type="button"
                className={`btn admin-claimable-btn ${newTaskEnabled === false ? "is-selected" : ""}`}
                onClick={() => setNewTaskEnabled(false)}
                disabled={savingNewTask}
              >
                Un-Claimable
              </button>
            </div>
            </div>

            {newTaskError && <p className="modal-error">{newTaskError}</p>}
            <div className="modal-actions new-task-modal-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={() => setShowNewTaskModal(false)}
                disabled={savingNewTask}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={handleSaveNewTask}
                disabled={savingNewTask || !newTaskName.trim() || !newTaskDepartmentId || !newTaskPhaseId || newTaskEnabled === null}
              >
                {savingNewTask ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewSustainingTaskModal && (
        <div className="modal-overlay" onClick={() => setShowNewSustainingTaskModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title" style={{ textAlign: "center" }}>New Sustaining Task</h3>
            <input
              className="modal-input new-task-name-input"
              style={{ marginTop: 2 }}
              type="text"
              placeholder="Enter task name"
              value={newSustainingTaskName}
              onChange={(e) => setNewSustainingTaskName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveNewSustainingTask()}
              autoFocus
              disabled={savingNewSustainingTask}
            />

            <div style={{ display: "flex", flexDirection: "column" }}>
              <p className="admin-detail-label">Departments</p>
              <div
                className="admin-detail-box"
                style={{ maxHeight: 180, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, padding: "8px 12px" }}
              >
                {departments.length === 0 ? (
                  <span className="muted">No departments available</span>
                ) : (
                  departments.map((dept) => (
                    <label key={dept.id} style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "flex-start", width: "100%", gap: 8, cursor: "pointer", fontSize: 14, marginBottom: 0, fontWeight: 400, textAlign: "left" }}>
                      <input
                        type="checkbox"
                        checked={newSustainingTaskDeptIds.includes(dept.id)}
                        onChange={(e) => {
                          setNewSustainingTaskDeptIds((prev) =>
                            e.target.checked ? [...prev, dept.id] : prev.filter((id) => id !== dept.id)
                          );
                        }}
                        disabled={savingNewSustainingTask}
                      />
                      {dept.name}
                    </label>
                  ))
                )}
              </div>

            </div>

            {newSustainingTaskError && <p className="modal-error">{newSustainingTaskError}</p>}
            <div className="modal-actions new-task-modal-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={() => setShowNewSustainingTaskModal(false)}
                disabled={savingNewSustainingTask}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={handleSaveNewSustainingTask}
                disabled={savingNewSustainingTask || !newSustainingTaskName.trim() || newSustainingTaskDeptIds.length === 0}
              >
                {savingNewSustainingTask ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={showConfirm}
        title={confirmTitle}
        message={confirmMessage}
        onCancel={() => setConfirmModal({ type: null, id: null, name: "" })}
        onConfirm={confirmAction}
        loading={confirmLoading}
        confirmLabel="Set Inactive"
      />
    </section>
  );
}
