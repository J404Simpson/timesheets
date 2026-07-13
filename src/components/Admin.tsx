import { useEffect, useMemo, useState } from "react";
import Recent from "./Recent";
import ViewFooter from "./ViewFooter";
import { getTasksForProjectPhase, getTasksForProjectPhaseWithInactive, deactivateTask, getAllTasks, updateTaskEnabled, updateTaskActive, updateTaskName, updateTaskDepartments, createTask, createSustainingTask, type Task } from "../api/task";
import { getDepartments, type Department } from "../api/department";
import {
  createProject,
  deactivateProject,
  reactivateProject,
  deactivateProjectPhase,
  reactivateProjectPhase,
  getAdminUsers,
  getPhasesForProject,
  getProjects,
  getWeekEntries,
  updateAdminUserHours,
  type AdminUserHoursUpdatePayload,
  type AdminUser,
  type EmployeeWeeklyHours,
  type Phase,
  type Project,
  type WeekEntry,
} from "../api/timesheet";

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

type EmployeeHoursModalProps = {
  open: boolean;
  userName: string;
  departmentId: number | null;
  departments: Department[];
  values: EmployeeWeeklyHours;
  canSave: boolean;
  error: string | null;
  loading: boolean;
  onChange: (field: keyof EmployeeWeeklyHours, value: string) => void;
  onDepartmentChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
};

function EmployeeHoursModal({
  open,
  userName,
  departmentId,
  departments,
  values,
  canSave,
  error,
  loading,
  onChange,
  onDepartmentChange,
  onClose,
  onSave,
}: EmployeeHoursModalProps) {
  if (!open) return null;

  const dayFields: Array<{ key: keyof EmployeeWeeklyHours; label: string }> = [
    { key: "hours_monday", label: "Monday" },
    { key: "hours_tuesday", label: "Tuesday" },
    { key: "hours_wednesday", label: "Wednesday" },
    { key: "hours_thursday", label: "Thursday" },
    { key: "hours_friday", label: "Friday" },
    { key: "hours_saturday", label: "Saturday" },
    { key: "hours_sunday", label: "Sunday" },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box employee-hours-modal" onClick={(event) => event.stopPropagation()}>
        <div className="employee-hours-header employee-hours-title">
          <span className="employee-hours-name">{userName}</span>
          <select
            className="employee-hours-department-select"
            value={departmentId ?? ""}
            onChange={(event) => onDepartmentChange(event.target.value)}
            disabled={loading}
          >
            <option value="" disabled>Select department</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>{department.name}</option>
            ))}
          </select>
        </div>
        <div className="employee-hours-grid">
          {dayFields.map((field) => (
            <label key={field.key} className="employee-hours-field">
              <span className="employee-hours-field-label">{field.label}</span>
              <input
                type="text"
                inputMode="decimal"
                maxLength={4}
                min="0"
                step="0.25"
                className="modal-input employee-hours-input"
                value={String(values[field.key])}
                onChange={(event) => onChange(field.key, event.target.value)}
                disabled={loading}
              />
            </label>
          ))}
        </div>
        <div className="employee-hours-total-section">
          <span className="employee-hours-total">Total: {formatHoursValue(values.hours)} hrs</span>
        </div>
        {error ? <p className="modal-error">{error}</p> : null}
        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button type="button" className="btn primary" onClick={onSave} disabled={loading || !canSave}>{loading ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

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

function formatHoursValue(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}

function calculateEmployeeHoursTotal(hours: Omit<EmployeeWeeklyHours, "hours">): number {
  return Number((
    hours.hours_monday +
    hours.hours_tuesday +
    hours.hours_wednesday +
    hours.hours_thursday +
    hours.hours_friday +
    hours.hours_saturday +
    hours.hours_sunday
  ).toFixed(2));
}

function toEmployeeWeeklyHours(user: AdminUser): EmployeeWeeklyHours {
  return {
    hours: Number(user.hours),
    hours_monday: Number(user.hours_monday),
    hours_tuesday: Number(user.hours_tuesday),
    hours_wednesday: Number(user.hours_wednesday),
    hours_thursday: Number(user.hours_thursday),
    hours_friday: Number(user.hours_friday),
    hours_saturday: Number(user.hours_saturday),
    hours_sunday: Number(user.hours_sunday),
  };
}

function isEmployeeHoursUnchanged(form: EmployeeWeeklyHours, user: AdminUser): boolean {
  return (
    Number(user.hours) === form.hours &&
    Number(user.hours_monday) === form.hours_monday &&
    Number(user.hours_tuesday) === form.hours_tuesday &&
    Number(user.hours_wednesday) === form.hours_wednesday &&
    Number(user.hours_thursday) === form.hours_thursday &&
    Number(user.hours_friday) === form.hours_friday &&
    Number(user.hours_saturday) === form.hours_saturday &&
    Number(user.hours_sunday) === form.hours_sunday
  );
}

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
    type:
      | "project"
      | "reactivate-project"
      | "phase"
      | "task"
      | "edit-task-name"
      | "edit-sustaining-task-name"
      | "reactivate-phase"
      | "allow-similar-new-task"
      | "allow-similar-new-sustaining-task"
      | "allow-similar-edit-sustaining-task-modal"
      | "allow-similar-edit-task-name"
      | "allow-similar-edit-sustaining-task-name"
      | "edit-task-qualifying"
      | "edit-task-departments"
      | "edit-task-status-change"
      | null;
    id: number | null;
    name: string;
    note?: string;
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
  const [editTaskNameDraft, setEditTaskNameDraft] = useState("");
  const [sustainingTaskNameDraft, setSustainingTaskNameDraft] = useState("");
  const [savingTaskEnabledId, setSavingTaskEnabledId] = useState<number | null>(null);
  const [savingTaskActiveId, setSavingTaskActiveId] = useState<number | null>(null);
  const [savingTaskNameId, setSavingTaskNameId] = useState<number | null>(null);
  const [savingTaskDepartmentsId, setSavingTaskDepartmentsId] = useState<number | null>(null);
  const [editTaskDepartmentDraftIds, setEditTaskDepartmentDraftIds] = useState<number[]>([]);
  const [sustainingTasksError, setSustainingTasksError] = useState<string | null>(null);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskDepartmentIds, setNewTaskDepartmentIds] = useState<number[]>([]);
  const [newTaskPhaseId, setNewTaskPhaseId] = useState<number | null>(null);
  const [newTaskEnabled, setNewTaskEnabled] = useState<boolean | null>(null);
  const [savingNewTask, setSavingNewTask] = useState(false);
  const [newTaskError, setNewTaskError] = useState<string | null>(null);
  const [showNewSustainingTaskModal, setShowNewSustainingTaskModal] = useState(false);
  const [editingSustainingTaskId, setEditingSustainingTaskId] = useState<number | null>(null);
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
  const [usersWeekOptions, setUsersWeekOptions] = useState<Array<{ offset: number; label: string }>>([]);
  const [editingUserHoursId, setEditingUserHoursId] = useState<number | null>(null);
  const [employeeHoursForm, setEmployeeHoursForm] = useState<EmployeeWeeklyHours>({
    hours: 0,
    hours_monday: 0,
    hours_tuesday: 0,
    hours_wednesday: 0,
    hours_thursday: 0,
    hours_friday: 0,
    hours_saturday: 0,
    hours_sunday: 0,
  });
  const [employeeHoursError, setEmployeeHoursError] = useState<string | null>(null);
  const [savingEmployeeHours, setSavingEmployeeHours] = useState(false);
  const [editingUserDepartmentId, setEditingUserDepartmentId] = useState<number | null>(null);

  const getMonday = (date: Date) => {
    const monday = new Date(date);
    const day = monday.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    monday.setDate(monday.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const formatWeekRangeLabel = (weekStart: Date) => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const start = `${weekStart.getDate()} ${weekStart.toLocaleDateString("en-GB", { month: "short" })}`;
    const end = `${weekEnd.getDate()} ${weekEnd.toLocaleDateString("en-GB", { month: "short" })}`;
    return `${start} - ${end}`;
  };

  const toDateKeyLocal = (value: Date) => {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const getErrorMessage = (error: unknown, fallback: string) => (
    error instanceof Error && error.message
      ? error.message
      : fallback
  );

  const isSimilarNameConflictMessage = (message: string) =>
    message.toLowerCase().includes("very similar to existing task");

  const haveSameDepartmentIds = (left: number[], right: number[]) => {
    if (left.length !== right.length) return false;
    const leftSet = new Set(left);
    for (const id of right) {
      if (!leftSet.has(id)) return false;
    }
    return true;
  };

  const closeSustainingTaskModal = () => {
    if (savingNewSustainingTask) return;
    setShowNewSustainingTaskModal(false);
    setEditingSustainingTaskId(null);
    setNewSustainingTaskName("");
    setNewSustainingTaskDeptIds([]);
    setNewSustainingTaskError(null);
  };

  const openNewSustainingTaskModal = () => {
    setEditingSustainingTaskId(null);
    setNewSustainingTaskName("");
    setNewSustainingTaskDeptIds([]);
    setNewSustainingTaskError(null);
    setShowNewSustainingTaskModal(true);
  };

  const openEditSustainingTaskModal = () => {
    if (!selectedSustainingTask) return;
    setEditingSustainingTaskId(selectedSustainingTask.id);
    setNewSustainingTaskName(selectedSustainingTask.name);
    setNewSustainingTaskDeptIds((selectedSustainingTask.departments ?? []).map((department) => department.id));
    setNewSustainingTaskError(null);
    setShowNewSustainingTaskModal(true);
  };

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
      const phaseData = await getPhasesForProject(projectId, true);
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

  const handleReactivateProject = (project: Project) => {
    if (project.active !== false) return;
    setConfirmModal({ type: "reactivate-project", id: project.id, name: project.name });
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

  const handleReactivatePhase = (phase: Phase) => {
    if (!selectedProjectId || phase.active !== false) return;
    setConfirmModal({ type: "reactivate-phase", id: phase.id, name: phase.name });
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
    let confirmLabel = "Confirm";
    let confirmAction = () => {};
    if (confirmModal.type === "project") {
      confirmTitle = "Set Project Inactive";
      confirmMessage = `Are you sure you want to set project "${confirmModal.name}" to inactive?`;
      confirmLoading = deactivatingProjectId === confirmModal.id;
      confirmAction = confirmDeactivateProject;
    } else if (confirmModal.type === "reactivate-project") {
      confirmTitle = "Set Project Active";
      confirmMessage = `Are you sure you want to set project "${confirmModal.name}" back to active?`;
      confirmLoading = deactivatingProjectId === confirmModal.id;
      confirmLabel = "Set Active";
      confirmAction = async () => {
        if (!confirmModal.id) return;
        setDeactivatingProjectId(confirmModal.id);
        setProjectError(null);
        try {
          await reactivateProject(confirmModal.id);
          await loadProjects(projectView);
        } catch {
          setProjectError("Failed to reactivate project.");
        } finally {
          setDeactivatingProjectId(null);
          setConfirmModal({ type: null, id: null, name: "" });
        }
      };
    } else if (confirmModal.type === "phase") {
      confirmTitle = "Set Phase Inactive";
      confirmMessage = `Are you sure you want to set phase "${confirmModal.name}" to inactive?`;
      confirmLoading = deactivatingPhaseId === confirmModal.id;
      confirmAction = confirmDeactivatePhase;
    } else if (confirmModal.type === "reactivate-phase") {
      confirmTitle = "Set Phase Active";
      confirmMessage = `Are you sure you want to set phase "${confirmModal.name}" back to active?`;
      confirmLoading = deactivatingPhaseId === confirmModal.id;
      confirmLabel = "Set Active";
      confirmAction = async () => {
        if (!selectedProjectId || !confirmModal.id) return;
        setDeactivatingPhaseId(confirmModal.id);
        setPhaseError(null);
        try {
          await reactivateProjectPhase(selectedProjectId, confirmModal.id);
          await loadPhasesForProject(selectedProjectId);
        } catch {
          setPhaseError("Failed to reactivate phase.");
        } finally {
          setDeactivatingPhaseId(null);
          setConfirmModal({ type: null, id: null, name: "" });
        }
      };
    } else if (confirmModal.type === "task") {
      confirmTitle = "Set Task Inactive";
      confirmMessage = `Are you sure you want to set task "${confirmModal.name}" to inactive?`;
      confirmLoading = deactivatingTaskId === confirmModal.id;
      confirmAction = confirmDeactivateTask;
    } else if (confirmModal.type === "edit-task-status-change") {
      const makeActive = confirmModal.note === "active";
      confirmTitle = makeActive ? "Set Task Active" : "Set Task Inactive";
      confirmMessage = `Are you sure you want to set task "${confirmModal.name}" to ${makeActive ? "active" : "inactive"}?`;
      confirmLoading = savingTaskActiveId === confirmModal.id;
      confirmLabel = makeActive ? "Set Active" : "Set Inactive";
      confirmAction = async () => {
        if (!confirmModal.id) return;
        await handleSetEditTaskActive(makeActive, confirmModal.id);
        setConfirmModal({ type: null, id: null, name: "" });
      };
    } else if (confirmModal.type === "edit-task-qualifying") {
      const setToQualifying = confirmModal.note === "qualifying";
      confirmTitle = "Confirm Qualifying Change";
      confirmMessage = `Are you sure you want to set task "${confirmModal.name}" to ${setToQualifying ? "qualifying" : "non-qualifying"}?`;
      confirmLoading = savingTaskEnabledId === confirmModal.id;
      confirmLabel = setToQualifying ? "Set Qualifying" : "Set Non-Qualifying";
      confirmAction = async () => {
        if (!confirmModal.id) return;
        await handleToggleEditTaskEnabled(confirmModal.id, setToQualifying);
        setConfirmModal({ type: null, id: null, name: "" });
      };
    } else if (confirmModal.type === "edit-task-departments") {
      confirmTitle = "Confirm Department Changes";
      confirmMessage = confirmModal.note ?? "Are you sure you want to update department assignments for this task?";
      confirmLoading = savingTaskDepartmentsId === confirmModal.id;
      confirmLabel = "Save Departments";
      confirmAction = async () => {
        await handleSaveEditTaskDepartments();
        setConfirmModal({ type: null, id: null, name: "" });
      };
    } else if (confirmModal.type === "edit-task-name") {
      confirmTitle = "Confirm Name Change";
      confirmMessage = `Are you sure you want to rename this task to "${confirmModal.name}"?`;
      confirmLoading = savingTaskNameId === confirmModal.id;
      confirmLabel = "Save Name";
      confirmAction = async () => {
        if (!confirmModal.id || !confirmModal.name.trim()) return;
        const taskId = confirmModal.id;
        const targetName = confirmModal.name.trim();
        setSavingTaskNameId(confirmModal.id);
        setAllTasksError(null);
        try {
          const updatedTask = await updateTaskName(taskId, targetName);
          setAllTasks((prev) => prev.map((task) => (
            task.id === updatedTask.id
              ? { ...task, name: updatedTask.name }
              : task
          )));
          setEditTaskNameDraft(updatedTask.name);
          setConfirmModal({ type: null, id: null, name: "" });
        } catch (err) {
          const errorMsg = getErrorMessage(err, "Failed to update task name.");
          if (isSimilarNameConflictMessage(errorMsg)) {
            setConfirmModal({
              type: "allow-similar-edit-task-name",
              id: taskId,
              name: targetName,
              note: errorMsg,
            });
          } else {
            setAllTasksError(errorMsg);
          }
        } finally {
          setSavingTaskNameId(null);
        }
      };
    } else if (confirmModal.type === "edit-sustaining-task-name") {
      confirmTitle = "Confirm Name Change";
      confirmMessage = `Are you sure you want to rename this task to "${confirmModal.name}"?`;
      confirmLoading = savingTaskNameId === confirmModal.id;
      confirmLabel = "Save Name";
      confirmAction = async () => {
        if (!confirmModal.id || !confirmModal.name.trim()) return;
        const taskId = confirmModal.id;
        const targetName = confirmModal.name.trim();
        setSavingTaskNameId(confirmModal.id);
        setSustainingTasksError(null);
        try {
          const updatedTask = await updateTaskName(taskId, targetName);
          setSustainingTasks((prev) => prev.map((task) => (
            task.id === updatedTask.id
              ? { ...task, name: updatedTask.name }
              : task
          )));
          setSustainingTaskNameDraft(updatedTask.name);
          setConfirmModal({ type: null, id: null, name: "" });
        } catch (err) {
          const errorMsg = getErrorMessage(err, "Failed to update task name.");
          if (isSimilarNameConflictMessage(errorMsg)) {
            setConfirmModal({
              type: "allow-similar-edit-sustaining-task-name",
              id: taskId,
              name: targetName,
              note: errorMsg,
            });
          } else {
            setSustainingTasksError(errorMsg);
          }
        } finally {
          setSavingTaskNameId(null);
        }
      };
    } else if (confirmModal.type === "allow-similar-new-task") {
      confirmTitle = "Similar Task Name";
      confirmMessage = `${confirmModal.note ?? "This task name is very similar to an existing task."} Create anyway?`;
      confirmLoading = savingNewTask;
      confirmLabel = "Create Anyway";
      confirmAction = async () => {
        setConfirmModal({ type: null, id: null, name: "" });
        await handleSaveNewTask(true);
      };
    } else if (confirmModal.type === "allow-similar-new-sustaining-task") {
      confirmTitle = "Similar Task Name";
      confirmMessage = `${confirmModal.note ?? "This task name is very similar to an existing task."} Create anyway?`;
      confirmLoading = savingNewSustainingTask;
      confirmLabel = "Create Anyway";
      confirmAction = async () => {
        setConfirmModal({ type: null, id: null, name: "" });
        await handleSaveNewSustainingTask(true);
      };
    } else if (confirmModal.type === "allow-similar-edit-sustaining-task-modal") {
      confirmTitle = "Similar Task Name";
      confirmMessage = `${confirmModal.note ?? "This task name is very similar to an existing task."} Save anyway?`;
      confirmLoading = savingNewSustainingTask;
      confirmLabel = "Save Anyway";
      confirmAction = async () => {
        setConfirmModal({ type: null, id: null, name: "" });
        await handleSaveNewSustainingTask(true);
      };
    } else if (confirmModal.type === "allow-similar-edit-task-name") {
      confirmTitle = "Similar Task Name";
      confirmMessage = `${confirmModal.note ?? "This task name is very similar to an existing task."} Save anyway?`;
      confirmLoading = savingTaskNameId === confirmModal.id;
      confirmLabel = "Save Anyway";
      confirmAction = async () => {
        if (!confirmModal.id || !confirmModal.name.trim()) return;
        const taskId = confirmModal.id;
        const targetName = confirmModal.name.trim();
        setSavingTaskNameId(taskId);
        setAllTasksError(null);
        try {
          const updatedTask = await updateTaskName(taskId, targetName, { allowSimilarName: true });
          setAllTasks((prev) => prev.map((task) => (
            task.id === updatedTask.id
              ? { ...task, name: updatedTask.name }
              : task
          )));
          setEditTaskNameDraft(updatedTask.name);
          setConfirmModal({ type: null, id: null, name: "" });
        } catch (err) {
          setAllTasksError(getErrorMessage(err, "Failed to update task name."));
        } finally {
          setSavingTaskNameId(null);
        }
      };
    } else if (confirmModal.type === "allow-similar-edit-sustaining-task-name") {
      confirmTitle = "Similar Task Name";
      confirmMessage = `${confirmModal.note ?? "This task name is very similar to an existing task."} Save anyway?`;
      confirmLoading = savingTaskNameId === confirmModal.id;
      confirmLabel = "Save Anyway";
      confirmAction = async () => {
        if (!confirmModal.id || !confirmModal.name.trim()) return;
        const taskId = confirmModal.id;
        const targetName = confirmModal.name.trim();
        setSavingTaskNameId(taskId);
        setSustainingTasksError(null);
        try {
          const updatedTask = await updateTaskName(taskId, targetName, { allowSimilarName: true });
          setSustainingTasks((prev) => prev.map((task) => (
            task.id === updatedTask.id
              ? { ...task, name: updatedTask.name }
              : task
          )));
          setSustainingTaskNameDraft(updatedTask.name);
          setConfirmModal({ type: null, id: null, name: "" });
        } catch (err) {
          setSustainingTasksError(getErrorMessage(err, "Failed to update task name."));
        } finally {
          setSavingTaskNameId(null);
        }
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

  const handleSaveNewTask = async (allowSimilarName = false) => {
    const trimmed = newTaskName.trim();
    if (!trimmed) {
      setNewTaskError("Task name is required.");
      return;
    }
    if (newTaskDepartmentIds.length === 0) {
      setNewTaskError("At least one department is required.");
      return;
    }
    if (!newTaskPhaseId) {
      setNewTaskError("Phase is required.");
      return;
    }
    if (newTaskEnabled === null) {
      setNewTaskError("Qualifying selection is required.");
      return;
    }
    setSavingNewTask(true);
    setNewTaskError(null);
    try {
      const task = await createTask(
        trimmed,
        newTaskDepartmentIds,
        newTaskPhaseId,
        newTaskEnabled,
        allowSimilarName ? { allowSimilarName: true } : undefined
      );
      setShowNewTaskModal(false);
      setNewTaskName("");
      setNewTaskDepartmentIds([]);
      setNewTaskPhaseId(null);
      setNewTaskEnabled(null);
      await loadAllTasks();
      setSelectedEditTaskId(task.id);
    } catch (err) {
      const errorMsg = getErrorMessage(err, "Failed to create task. Please try again.");
      if (!allowSimilarName && isSimilarNameConflictMessage(errorMsg)) {
        setConfirmModal({
          type: "allow-similar-new-task",
          id: null,
          name: trimmed,
          note: errorMsg,
        });
      } else {
        setNewTaskError(errorMsg);
      }
    } finally {
      setSavingNewTask(false);
    }
  };

  const handleSaveNewSustainingTask = async (allowSimilarName = false) => {
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
      if (editingSustainingTaskId != null) {
        const editingTask = sustainingTasks.find((task) => task.id === editingSustainingTaskId) ?? selectedSustainingTask;
        if (!editingTask) {
          setNewSustainingTaskError("Task not found.");
          return;
        }

        const currentDepartmentIds = (editingTask.departments ?? []).map((department) => department.id);
        const nameChanged = trimmed !== editingTask.name;
        const departmentsChanged = !haveSameDepartmentIds(currentDepartmentIds, newSustainingTaskDeptIds);

        let updatedName = editingTask.name;
        let updatedDepartments = editingTask.departments;

        if (nameChanged) {
          try {
            const updatedTask = await updateTaskName(
              editingTask.id,
              trimmed,
              allowSimilarName ? { allowSimilarName: true } : undefined
            );
            updatedName = updatedTask.name;
          } catch (err) {
            const errorMsg = getErrorMessage(err, "Failed to update task name.");
            if (!allowSimilarName && isSimilarNameConflictMessage(errorMsg)) {
              setConfirmModal({
                type: "allow-similar-edit-sustaining-task-modal",
                id: editingTask.id,
                name: trimmed,
                note: errorMsg,
              });
            } else {
              setNewSustainingTaskError(errorMsg);
            }
            return;
          }
        }

        if (departmentsChanged) {
          const updatedTask = await updateTaskDepartments(editingTask.id, newSustainingTaskDeptIds);
          updatedName = updatedTask.name;
          updatedDepartments = updatedTask.departments;
        }

        if (!nameChanged && !departmentsChanged) {
          closeSustainingTaskModal();
          return;
        }

        setSustainingTasks((prev) => prev.map((task) => (
          task.id === editingTask.id
            ? {
                ...task,
                name: updatedName,
                departments: updatedDepartments,
              }
            : task
        )));
        setSustainingTaskNameDraft(updatedName);
        closeSustainingTaskModal();
      } else {
        await createSustainingTask(
          trimmed,
          newSustainingTaskDeptIds,
          false,
          allowSimilarName ? { allowSimilarName: true } : undefined
        );
        closeSustainingTaskModal();
        await loadSustainingTasks(sustainingView);
      }
    } catch (err) {
      const errorMsg = getErrorMessage(err, "Failed to create task. Please try again.");
      if (!allowSimilarName && isSimilarNameConflictMessage(errorMsg)) {
        setConfirmModal({
          type: "allow-similar-new-sustaining-task",
          id: null,
          name: trimmed,
          note: errorMsg,
        });
      } else {
        setNewSustainingTaskError(errorMsg);
      }
    } finally {
      setSavingNewSustainingTask(false);
    }
  };

  useEffect(() => {
    loadUsers();
    getDepartments().then(setDepartments).catch(() => {});
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
    setSustainingTasksError(null);
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
  const selectedSustainingTask = useMemo(
    () => sustainingTasks.find((task) => task.id === selectedSustainingTaskId) ?? null,
    [sustainingTasks, selectedSustainingTaskId]
  );

  const projectEditTasks = useMemo(
    () => allTasks.filter((task) => task.task_type === "PROJECT"),
    [allTasks]
  );

  const taskMatchesDepartmentFilter = (task: Task, departmentId: number | null) => {
    if (departmentId === null) return true;
    return (task.departments ?? []).some((d) => d.id === departmentId);
  };

  const editTaskPhaseOptions = useMemo(() => {
    const phaseMap = new Map<number, string>();
    for (const task of projectEditTasks) {
      if (!taskMatchesDepartmentFilter(task, editTaskDeptFilter)) continue;
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
      .filter((task) => taskMatchesDepartmentFilter(task, editTaskDeptFilter))
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

  useEffect(() => {
    setEditTaskNameDraft(selectedEditTask?.name ?? "");
  }, [selectedEditTask]);

  useEffect(() => {
    setEditTaskDepartmentDraftIds((selectedEditTask?.departments ?? []).map((department) => department.id));
  }, [selectedEditTask]);

  useEffect(() => {
    setSustainingTaskNameDraft(selectedSustainingTask?.name ?? "");
  }, [selectedSustainingTask]);

  const hasEditTaskDepartmentChanges = useMemo(() => {
    if (!selectedEditTask) return false;

    const current = new Set((selectedEditTask.departments ?? []).map((department) => department.id));
    const draft = new Set(editTaskDepartmentDraftIds);

    if (current.size !== draft.size) return true;
    for (const id of draft) {
      if (!current.has(id)) return true;
    }
    return false;
  }, [selectedEditTask, editTaskDepartmentDraftIds]);

  const handleSaveEditTaskDepartments = async () => {
    if (!selectedEditTask) return;
    if (editTaskDepartmentDraftIds.length === 0) {
      setAllTasksError("At least one department is required.");
      return;
    }
    if (!hasEditTaskDepartmentChanges) return;

    setSavingTaskDepartmentsId(selectedEditTask.id);
    setAllTasksError(null);
    try {
      const updatedTask = await updateTaskDepartments(selectedEditTask.id, editTaskDepartmentDraftIds);
      setAllTasks((prev) => prev.map((task) => (
        task.id === updatedTask.id
          ? { ...task, departments: updatedTask.departments }
          : task
      )));
    } catch {
      setAllTasksError("Failed to update task departments.");
    } finally {
      setSavingTaskDepartmentsId(null);
    }
  };

  const handleRequestEditTaskDepartmentsSave = () => {
    if (!selectedEditTask) return;
    if (editTaskDepartmentDraftIds.length === 0) {
      setAllTasksError("At least one department is required.");
      return;
    }
    if (!hasEditTaskDepartmentChanges) return;

    setConfirmModal({
      type: "edit-task-departments",
      id: selectedEditTask.id,
      name: selectedEditTask.name,
      note: "Are you sure you want to update department assignments for this task?",
    });
  };

  const handleToggleEditTaskEnabled = async (taskId: number, enabled: boolean) => {
    setSavingTaskEnabledId(taskId);
    setAllTasksError(null);
    try {
      const updatedTask = await updateTaskEnabled(taskId, enabled);
      setAllTasks((prev) => prev.map((task) => (task.id === updatedTask.id ? { ...task, enabled: updatedTask.enabled } : task)));
    } catch {
      setAllTasksError("Failed to update task enabled state.");
    } finally {
      setSavingTaskEnabledId(null);
    }
  };

  const handleRequestEditTaskEnabledChange = (enabled: boolean) => {
    if (!selectedEditTask) return;
    if (selectedEditTask.enabled === enabled) return;

    setConfirmModal({
      type: "edit-task-qualifying",
      id: selectedEditTask.id,
      name: selectedEditTask.name,
      note: enabled ? "qualifying" : "non-qualifying",
    });
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
    const nextActive = !selectedEditTask.active;
    setConfirmModal({
      type: "edit-task-status-change",
      id: selectedEditTask.id,
      name: selectedEditTask.name,
      note: nextActive ? "active" : "inactive",
    });
  };

  const handleRequestEditTaskNameSave = () => {
    if (!selectedEditTask) return;
    const trimmed = editTaskNameDraft.trim();
    if (!trimmed) {
      setEditTaskNameDraft(selectedEditTask.name);
      return;
    }
    if (trimmed === selectedEditTask.name) {
      return;
    }
    if (
      confirmModal.type === "edit-task-name"
      && confirmModal.id === selectedEditTask.id
      && confirmModal.name === trimmed
    ) {
      return;
    }
    setEditTaskNameDraft(trimmed);
    setConfirmModal({ type: "edit-task-name", id: selectedEditTask.id, name: trimmed });
  };

  const handleRequestSustainingTaskNameSave = () => {
    if (!selectedSustainingTask) return;
    const trimmed = sustainingTaskNameDraft.trim();
    if (!trimmed) {
      setSustainingTaskNameDraft(selectedSustainingTask.name);
      return;
    }
    if (trimmed === selectedSustainingTask.name) {
      return;
    }
    if (
      confirmModal.type === "edit-sustaining-task-name"
      && confirmModal.id === selectedSustainingTask.id
      && confirmModal.name === trimmed
    ) {
      return;
    }
    setSustainingTaskNameDraft(trimmed);
    setConfirmModal({ type: "edit-sustaining-task-name", id: selectedSustainingTask.id, name: trimmed });
  };

  const getUserDisplayName = (user: AdminUser) => {
    const name = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
    return name || user.email;
  };

  const openEmployeeHoursModal = (user: AdminUser) => {
    setEditingUserHoursId(user.id);
    setEmployeeHoursForm(toEmployeeWeeklyHours(user));
    setEditingUserDepartmentId(user.department_id ?? null);
    setEmployeeHoursError(null);
  };

  const closeEmployeeHoursModal = () => {
    if (savingEmployeeHours) return;
    setEditingUserHoursId(null);
    setEditingUserDepartmentId(null);
    setEmployeeHoursError(null);
  };

  const handleEmployeeHoursFieldChange = (field: keyof EmployeeWeeklyHours, rawValue: string) => {
    if (field === "hours") {
      return;
    }

    const parsed = rawValue.trim() === "" ? 0 : Number(rawValue);
    setEmployeeHoursForm((prev) => {
      const next = {
        ...prev,
        [field]: Number.isFinite(parsed) && parsed >= 0 ? Number(parsed.toFixed(2)) : 0,
      } as EmployeeWeeklyHours;

      next.hours = calculateEmployeeHoursTotal({
        hours_monday: next.hours_monday,
        hours_tuesday: next.hours_tuesday,
        hours_wednesday: next.hours_wednesday,
        hours_thursday: next.hours_thursday,
        hours_friday: next.hours_friday,
        hours_saturday: next.hours_saturday,
        hours_sunday: next.hours_sunday,
      });

      return next;
    });
    setEmployeeHoursError(null);
  };

  const handleEmployeeDepartmentChange = (rawValue: string) => {
    setEditingUserDepartmentId(rawValue === "" ? null : Number(rawValue));
    setEmployeeHoursError(null);
  };

  const handleSaveEmployeeHours = async () => {
    if (editingUserHoursId == null) return;
    if (editingUserDepartmentId == null) {
      setEmployeeHoursError("Department is required.");
      return;
    }

    setSavingEmployeeHours(true);
    setEmployeeHoursError(null);
    try {
      const payload: AdminUserHoursUpdatePayload = {
        ...employeeHoursForm,
        department_id: editingUserDepartmentId,
      };
      const updatedUser = await updateAdminUserHours(editingUserHoursId, payload);
      setUsers((prev) => prev.map((user) => (user.id === updatedUser.id ? updatedUser : user)));
      setEditingUserHoursId(null);
      setEditingUserDepartmentId(null);
    } catch {
      setEmployeeHoursError("Failed to update employee details.");
    } finally {
      setSavingEmployeeHours(false);
    }
  };

  const editingUser = useMemo(
    () => users.find((user) => user.id === editingUserHoursId) ?? null,
    [users, editingUserHoursId]
  );

  const canSaveEmployeeHours = useMemo(() => {
    if (!editingUser) return false;
    if (editingUserDepartmentId == null) return false;

    const departmentChanged = (editingUser.department_id ?? null) !== editingUserDepartmentId;
    const hoursChanged = !isEmployeeHoursUnchanged(employeeHoursForm, editingUser);

    return departmentChanged || hoursChanged;
  }, [editingUser, editingUserDepartmentId, employeeHoursForm]);

  useEffect(() => {
    if (activeSection !== "users" || !selectedUser) {
      setUsersWeekOptions([]);
      return;
    }

    const currentMonday = getMonday(new Date());
    const sixMonthsAgo = new Date(currentMonday);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sixMonthsAgoMonday = getMonday(sixMonthsAgo);

    const options: Array<{ offset: number; label: string }> = [];
    for (
      let cursor = new Date(currentMonday);
      cursor >= sixMonthsAgoMonday;
      cursor.setDate(cursor.getDate() - 7)
    ) {
      const offset = Math.round((cursor.getTime() - currentMonday.getTime()) / (7 * 24 * 60 * 60 * 1000));
      options.push({
        offset,
        label: formatWeekRangeLabel(new Date(cursor)),
      });
    }

    setUsersWeekOptions(options);
    setUsersWeekOffset((prev) => {
      if (options.some((opt) => opt.offset === prev)) return prev;
      return 0;
    });
  }, [activeSection, selectedUser?.id]);

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
                            <button
                              type="button"
                              className="btn secondary admin-record-status-btn"
                              onClick={() => handleReactivateProject(project)}
                              disabled={deactivatingProjectId === project.id}
                              title="Set active"
                            >
                              {deactivatingProjectId === project.id ? "Saving..." : "Inactive"}
                            </button>
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
                              <button
                                type="button"
                                className="btn secondary admin-record-status-btn"
                                onClick={() => handleReactivatePhase(phase)}
                                disabled={deactivatingPhaseId === phase.id}
                                title="Set active"
                              >
                                {deactivatingPhaseId === phase.id ? "Saving..." : "Inactive"}
                              </button>
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
                      .filter((task) => taskMatchesDepartmentFilter(task, taskDeptFilter))
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
                {selectedEditTask ? (
                  <div className="admin-task-detail">
                    <div className="admin-task-detail-body">
                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", marginBottom: 10 }}>
                        <div />
                        <h3 style={{ margin: 0, textAlign: "center" }}>{selectedEditTask.name}</h3>
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            className="btn secondary admin-record-status-btn"
                            onClick={handleEditTaskStatusToggle}
                            disabled={savingTaskActiveId === selectedEditTask.id}
                            style={{ minWidth: 92, textAlign: "center" }}
                          >
                            {savingTaskActiveId === selectedEditTask.id
                              ? "Saving..."
                              : selectedEditTask.active
                                ? "Active"
                                : "Inactive"}
                          </button>
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <input
                          type="text"
                          className="modal-input admin-detail-input"
                          style={{ marginTop: 0 }}
                          value={editTaskNameDraft}
                          onChange={(e) => setEditTaskNameDraft(e.target.value)}
                          onBlur={handleRequestEditTaskNameSave}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              (e.currentTarget as HTMLInputElement).blur();
                            }
                          }}
                          disabled={savingTaskNameId === selectedEditTask.id}
                        />
                      </div>

                      <p className="admin-detail-label">Phase</p>
                      <div className="admin-detail-box">
                        {selectedEditTask.phases && selectedEditTask.phases.length > 0
                          ? selectedEditTask.phases.map((ph) => ph.name).join(", ")
                          : <span className="muted">No phase assigned</span>}
                      </div>

                      <p className="admin-detail-label">Departments</p>
                      <div className="admin-detail-box">
                        {selectedEditTask.departments && selectedEditTask.departments.length > 0
                          ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 2, width: "100%" }}>
                              {selectedEditTask.departments.map((department) => (
                                <div key={department.id}>{department.name}</div>
                              ))}
                            </div>
                          )
                          : <span className="muted">No department assigned</span>}
                      </div>
                    </div>

                    <div className="admin-task-qualifying-btns">
                      <button
                        type="button"
                        className={`btn admin-qualifying-btn ${selectedEditTask.enabled ? "is-selected" : ""}`}
                        onClick={() => handleRequestEditTaskEnabledChange(true)}
                        disabled={savingTaskEnabledId === selectedEditTask.id || selectedEditTask.enabled}
                      >
                        Qualifying
                      </button>
                      <button
                        type="button"
                        className={`btn admin-qualifying-btn ${!selectedEditTask.enabled ? "is-selected" : ""}`}
                        onClick={() => handleRequestEditTaskEnabledChange(false)}
                        disabled={savingTaskEnabledId === selectedEditTask.id || !selectedEditTask.enabled}
                      >
                        Non-Qualifying
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

                {sustainingTasksError && <p className="admin-error">{sustainingTasksError}</p>}

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
                {selectedSustainingTask ? (
                    <div className="admin-task-detail">
                      <div className="admin-task-detail-body">
                        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", marginBottom: 10 }}>
                          <div />
                          <h3 style={{ margin: 0, textAlign: "center" }}>{selectedSustainingTask.name}</h3>
                          <div style={{ display: "flex", justifyContent: "flex-end" }}>
                            <button
                              type="button"
                              className="btn secondary admin-record-status-btn"
                              onClick={() => handleDeactivateTask(selectedSustainingTask)}
                              disabled={deactivatingTaskId === selectedSustainingTask.id || !selectedSustainingTask.active}
                              style={{ minWidth: 92, textAlign: "center" }}
                            >
                              {deactivatingTaskId === selectedSustainingTask.id ? "Saving..." : selectedSustainingTask.active ? "Active" : "Inactive"}
                            </button>
                          </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <input
                            type="text"
                            className="modal-input admin-detail-input"
                            style={{ marginTop: 0 }}
                            value={sustainingTaskNameDraft}
                            onChange={(e) => setSustainingTaskNameDraft(e.target.value)}
                            onBlur={handleRequestSustainingTaskNameSave}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                (e.currentTarget as HTMLInputElement).blur();
                              }
                            }}
                            disabled={savingTaskNameId === selectedSustainingTask.id}
                          />
                        </div>

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

                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                          <button
                            type="button"
                            className="btn secondary"
                            onClick={openEditSustainingTaskModal}
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="muted">Select a sustaining task to view details.</p>
                  )}
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
                          <div className={`admin-user-item admin-record-item ${selected ? "is-active" : ""}`}>
                            <button
                              type="button"
                              className="admin-record-select"
                              onClick={() => setSelectedUserId(user.id)}
                            >
                              <span className="admin-user-name">{getUserDisplayName(user)}</span>
                            </button>
                            <button
                              type="button"
                              className="btn secondary admin-record-status-btn admin-user-hours-btn"
                              onClick={() => openEmployeeHoursModal(user)}
                              title="Edit weekly hours"
                            >
                              {formatHoursValue(Number(user.hours))} hrs
                            </button>
                          </div>
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

      <EmployeeHoursModal
        open={editingUser != null}
        userName={editingUser ? getUserDisplayName(editingUser) : ""}
        departmentId={editingUserDepartmentId}
        departments={departments}
        values={employeeHoursForm}
        canSave={canSaveEmployeeHours}
        error={employeeHoursError}
        loading={savingEmployeeHours}
        onChange={handleEmployeeHoursFieldChange}
        onDepartmentChange={handleEmployeeDepartmentChange}
        onClose={closeEmployeeHoursModal}
        onSave={handleSaveEmployeeHours}
      />

      <ViewFooter
        startContent={
          activeSection === "users" ? (
            <select
              className="btn week-nav-toggle"
              value={String(usersWeekOffset)}
              onChange={(e) => setUsersWeekOffset(Number(e.target.value))}
              aria-label="Select week range"
            >
              {usersWeekOptions.map((option) => (
                <option key={option.offset} value={option.offset}>
                  {option.label}
                </option>
              ))}
            </select>
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
                  setNewTaskDepartmentIds([]);
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
              onClick={openNewSustainingTaskModal}
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
            <p className="admin-detail-label">Departments</p>
            <div
              className="admin-detail-box"
              style={{ maxHeight: 140, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, padding: "8px 12px" }}
            >
              {departments.length === 0 ? (
                <span className="muted">No departments available</span>
              ) : (
                departments.map((dept) => (
                  <label key={dept.id} style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "flex-start", width: "100%", gap: 8, cursor: "pointer", fontSize: 14, marginBottom: 0, fontWeight: 400, textAlign: "left" }}>
                    <input
                      type="checkbox"
                      checked={newTaskDepartmentIds.includes(dept.id)}
                      onChange={(e) => {
                        setNewTaskDepartmentIds((prev) =>
                          e.target.checked ? [...prev, dept.id] : prev.filter((id) => id !== dept.id)
                        );
                      }}
                      disabled={savingNewTask}
                    />
                    {dept.name}
                  </label>
                ))
              )}
            </div>

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

            <p className="admin-detail-label">Qualifying</p>
            <div className="admin-task-qualifying-btns new-task-qualifying-btns">
              <button
                type="button"
                className={`btn admin-qualifying-btn ${newTaskEnabled === true ? "is-selected" : ""}`}
                onClick={() => setNewTaskEnabled(true)}
                disabled={savingNewTask}
              >
                Qualifying
              </button>
              <button
                type="button"
                className={`btn admin-qualifying-btn ${newTaskEnabled === false ? "is-selected" : ""}`}
                onClick={() => setNewTaskEnabled(false)}
                disabled={savingNewTask}
              >
                Non-Qualifying
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
                disabled={savingNewTask || !newTaskName.trim() || newTaskDepartmentIds.length === 0 || !newTaskPhaseId || newTaskEnabled === null}
              >
                {savingNewTask ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewSustainingTaskModal && (
        <div className="modal-overlay" onClick={closeSustainingTaskModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
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
                onClick={closeSustainingTaskModal}
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
        confirmLabel={confirmLabel}
      />
    </section>
  );
}
