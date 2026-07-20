import { acquireTokenSilent, protectedResources } from "../auth/msalConfig";

async function getAuthHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const accessToken = await acquireTokenSilent([protectedResources.timesheetApi.scope]);
  return {
    Authorization: `Bearer ${accessToken}`,
    "X-Timezone-Offset-Minutes": String(new Date().getTimezoneOffset()),
    ...extra,
  };
}

function buildUrl(path: string, params?: Record<string, string | number>): string {
  const apiBase = import.meta.env.VITE_API_URL;
  const url = new URL(`${apiBase}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function requestJson<T>(url: string, init: RequestInit, errorMessage: string): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`${errorMessage} (${response.status})`);
  }
  return response.json() as Promise<T>;
}

// Fetch phases for a given project
export type Phase = {
  id: number;
  name: string;
  description?: string;
  active?: boolean;
  enabled?: boolean;
};

export async function getPhasesForProject(projectId: number, includeInactive = false): Promise<Phase[]> {
  try {
    const headers = await getAuthHeaders();
    const data = await requestJson<{ phases: Phase[] }>(
      buildUrl(
        `/api/projects/${projectId}/phases`,
        includeInactive ? { includeInactive: "true" } : undefined
      ),
      { headers },
      "Failed to fetch phases for project"
    );
    return data.phases;
  } catch {
    throw new Error("Failed to fetch phases for project");
  }
}

// Fetch active projects from the backend
export type Project = {
  id: number;
  name: string;
  active?: boolean;
  description?: string;
  created_at?: string;
};

export async function getActiveProjects(): Promise<Project[]> {
  try {
    const headers = await getAuthHeaders();
    const data = await requestJson<{ projects: Project[] }>(
      buildUrl("/api/projects"),
      { headers },
      "Failed to fetch active projects"
    );
    return data.projects;
  } catch {
    throw new Error("Failed to fetch active projects");
  }
}

export async function getProjects(includeInactive = false): Promise<Project[]> {
  try {
    const headers = await getAuthHeaders();
    const data = await requestJson<{ projects: Project[] }>(
      buildUrl("/api/projects", includeInactive ? { includeInactive: "true" } : undefined),
      { headers },
      "Failed to fetch projects"
    );
    return data.projects;
  } catch {
    throw new Error("Failed to fetch projects");
  }
}

export async function createProject(name: string, description?: string): Promise<Project> {
  const headers = await getAuthHeaders({ "Content-Type": "application/json" });
  const data = await requestJson<{ project: Project }>(
    buildUrl("/api/projects"),
    {
      method: "POST",
      headers,
      body: JSON.stringify({ name, description }),
    },
    "Failed to create project"
  );
  return data.project;
}

export async function deactivateProject(projectId: number): Promise<Project> {
  const headers = await getAuthHeaders({ "Content-Type": "application/json" });
  const data = await requestJson<{ project: Project }>(
    buildUrl(`/api/projects/${projectId}/deactivate`),
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({ active: false }),
    },
    "Failed to deactivate project"
  );
  return data.project;
}

export async function reactivateProject(projectId: number): Promise<Project> {
  const headers = await getAuthHeaders({ "Content-Type": "application/json" });
  const data = await requestJson<{ project: Project }>(
    buildUrl(`/api/projects/${projectId}/activate`),
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({}),
    },
    "Failed to reactivate project"
  );
  return data.project;
}

export async function deactivateProjectPhase(projectId: number, phaseId: number): Promise<Phase> {
  const headers = await getAuthHeaders({ "Content-Type": "application/json" });
  const data = await requestJson<{ phase: Phase }>(
    buildUrl(`/api/projects/${projectId}/phases/${phaseId}/deactivate`),
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({ active: false }),
    },
    "Failed to deactivate phase"
  );
  return data.phase;
}

export async function reactivateProjectPhase(projectId: number, phaseId: number): Promise<Phase> {
  const headers = await getAuthHeaders({ "Content-Type": "application/json" });
  const data = await requestJson<{ phase: Phase }>(
    buildUrl(`/api/projects/${projectId}/phases/${phaseId}/activate`),
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({}),
    },
    "Failed to reactivate phase"
  );
  return data.phase;
}

const LOGIN_URL = `${import.meta.env.VITE_API_URL}/login`;
const BASE_URL = `${import.meta.env.VITE_API_URL}/timesheet`;

// Function to notify the backend of user login
export async function notifyLogin(
  firstName: string,
  lastName: string,
  email: string,
  object_id: string
): Promise<any> {
  try {
    const headers = await getAuthHeaders({ "Content-Type": "application/json" });
    return await requestJson(
      LOGIN_URL,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ firstName, lastName, email, object_id }),
      },
      "Failed to notify backend of login"
    );
  } catch {
    throw new Error("Failed to notify backend of login");
  }
}

// Function to fetch timesheets
type Timesheet = {
  id: string;
  date: string;
  hoursWorked: number;
  project: string;
};

export async function getTimesheets(): Promise<Timesheet[]> {
  try {
    const headers = await getAuthHeaders();
    return await requestJson<Timesheet[]>(BASE_URL, { headers }, "Failed to retrieve timesheets");
  } catch {
    throw new Error("Failed to retrieve timesheets");
  }
}

export type WeekEntry = {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  hours: number;
  notes?: string;
  project?: { id: number; name: string };
  task?: { id: number; name: string };
  project_phase?: {
    id: number;
    phase: { id: number; name: string };
  };
};

export type CurrentEmployee = {
  id: number;
  object_id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  admin?: boolean | null;
  department_id?: number | null;
};

export type EmployeeWeeklyHours = {
  hours: number;
  hours_monday: number;
  hours_tuesday: number;
  hours_wednesday: number;
  hours_thursday: number;
  hours_friday: number;
  hours_saturday: number;
  hours_sunday: number;
};

export type AdminUser = EmployeeWeeklyHours & {
  id: number;
  object_id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  department_id?: number | null;
};

export type AdminUserHoursUpdatePayload = EmployeeWeeklyHours & {
  department_id: number;
};

function toNumericValue(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeAdminUser(user: AdminUser): AdminUser {
  return {
    ...user,
    hours: toNumericValue(user.hours),
    hours_monday: toNumericValue(user.hours_monday),
    hours_tuesday: toNumericValue(user.hours_tuesday),
    hours_wednesday: toNumericValue(user.hours_wednesday),
    hours_thursday: toNumericValue(user.hours_thursday),
    hours_friday: toNumericValue(user.hours_friday),
    hours_saturday: toNumericValue(user.hours_saturday),
    hours_sunday: toNumericValue(user.hours_sunday),
  };
}

export async function getCurrentUser(): Promise<CurrentEmployee> {
  const headers = await getAuthHeaders();
  const data = await requestJson<{ employee: CurrentEmployee }>(
    buildUrl("/api/me"),
    { headers },
    "Failed to fetch current user"
  );
  return data.employee;
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const headers = await getAuthHeaders();
  const data = await requestJson<{ users: AdminUser[] }>(
    buildUrl("/api/admin/users"),
    { headers },
    "Failed to fetch admin employees"
  );
  return data.users.map(normalizeAdminUser);
}

export async function updateAdminUserHours(
  employeeId: number,
  payload: AdminUserHoursUpdatePayload
): Promise<AdminUser> {
  const headers = await getAuthHeaders({ "Content-Type": "application/json" });
  const data = await requestJson<{ user: AdminUser }>(
    buildUrl(`/api/admin/users/${employeeId}/hours`),
    {
      method: "PATCH",
      headers,
      body: JSON.stringify(payload),
    },
    "Failed to update employee hours"
  );
  return normalizeAdminUser(data.user);
}

export async function getWeekEntries(weekOf?: string, employeeId?: number): Promise<WeekEntry[]> {
  const params: Record<string, string | number> = {};
  if (weekOf) params.weekOf = weekOf;
  if (employeeId != null) params.employeeId = employeeId;

  const headers = await getAuthHeaders();
  const data = await requestJson<{ entries: WeekEntry[] }>(
    buildUrl(
      "/api/entries/week",
      Object.keys(params).length > 0 ? params : undefined
    ),
    { headers },
    "Failed to fetch week entries"
  );
  return data.entries;
}

export type EntryDateBounds = {
  firstDate: string | null;
  lastDate: string | null;
};

export async function getEntryDateBounds(employeeId?: number): Promise<EntryDateBounds> {
  const headers = await getAuthHeaders();
  const data = await requestJson<EntryDateBounds>(
    buildUrl("/api/entries/date-bounds", employeeId != null ? { employeeId } : undefined),
    { headers },
    "Failed to fetch entry date bounds"
  );
  return data;
}

export type CreateEntryPayload = {
  projectId: number;
  phaseId?: number | null;
  taskId?: number | null;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  hours?: number;
  notes?: string;
};

export async function createEntry(payload: CreateEntryPayload, employeeId?: number): Promise<any> {
  const headers = await getAuthHeaders({ "Content-Type": "application/json" });
  return requestJson(
    buildUrl("/api/entries", employeeId != null ? { employeeId } : undefined),
    {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    },
    "Failed to create entry"
  );
}

export async function updateEntry(entryId: number, payload: CreateEntryPayload, employeeId?: number): Promise<any> {
  const headers = await getAuthHeaders({ "Content-Type": "application/json" });
  return requestJson(
    buildUrl(`/api/entries/${entryId}`, employeeId != null ? { employeeId } : undefined),
    {
      method: "PUT",
      headers,
      body: JSON.stringify(payload),
    },
    "Failed to update entry"
  );
}

export async function updateLeaveEntryTime(entryId: number, startTime: string): Promise<any> {
  const headers = await getAuthHeaders({ "Content-Type": "application/json" });
  return requestJson(
    buildUrl(`/api/entries/${entryId}/leave-time`),
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({ startTime }),
    },
    "Failed to update leave entry time"
  );
}

export async function deleteEntry(entryId: number, employeeId?: number): Promise<any> {
  const headers = await getAuthHeaders();
  return requestJson(
    buildUrl(`/api/entries/${entryId}`, employeeId != null ? { employeeId } : undefined),
    {
      method: "DELETE",
      headers,
    },
    "Failed to delete entry"
  );
}