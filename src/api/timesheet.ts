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
  enabled?: boolean;
};

export async function getPhasesForProject(projectId: number): Promise<Phase[]> {
  try {
    const headers = await getAuthHeaders();
    const data = await requestJson<{ phases: Phase[] }>(
      buildUrl(`/api/projects/${projectId}/phases`),
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

export type AdminUser = {
  id: number;
  object_id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  department_id?: number | null;
};

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
    "Failed to fetch admin users"
  );
  return data.users;
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