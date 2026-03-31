// Fetch phases for a given project
export type Phase = {
  id: number;
  name: string;
  description?: string;
  enabled?: boolean;
};

export async function getPhasesForProject(projectId: number): Promise<Phase[]> {
  try {
    const accessToken = await acquireTokenSilent([protectedResources.timesheetApi.scope]);
    const apiBase = import.meta.env.VITE_API_URL;
    const response = await axios.get(`${apiBase}/api/projects/${projectId}/phases`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data.phases;
  } catch (error) {
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
    const accessToken = await acquireTokenSilent([protectedResources.timesheetApi.scope]);
    const apiBase = import.meta.env.VITE_API_URL;
    const response = await axios.get(`${apiBase}/api/projects`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data.projects;
  } catch (error) {
    throw new Error("Failed to fetch active projects");
  }
}
import { acquireTokenSilent, protectedResources } from "../auth/msalConfig";
import axios from "axios";
import type { AxiosResponse } from "axios";

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
    // Acquire access token
    const accessToken = await acquireTokenSilent([protectedResources.timesheetApi.scope]);
    // Make the POST request to the backend
    const response = await axios.post(
      LOGIN_URL,
      { firstName, lastName, email, object_id },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return response.data;
  } catch (error: any) {
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
    // Acquire access token
    const accessToken = await acquireTokenSilent([protectedResources.timesheetApi.scope]);

    // Configure axios request with Authorization header
    const response: AxiosResponse<Timesheet[]> = await axios.get(BASE_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
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
  const accessToken = await acquireTokenSilent([protectedResources.timesheetApi.scope]);
  const apiBase = import.meta.env.VITE_API_URL;
  const response = await axios.get(`${apiBase}/api/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.data.employee;
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const accessToken = await acquireTokenSilent([protectedResources.timesheetApi.scope]);
  const apiBase = import.meta.env.VITE_API_URL;
  const response = await axios.get(`${apiBase}/api/admin/users`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.data.users;
}

export async function getWeekEntries(weekOf?: string, employeeId?: number): Promise<WeekEntry[]> {
  const accessToken = await acquireTokenSilent([protectedResources.timesheetApi.scope]);
  const apiBase = import.meta.env.VITE_API_URL;
  const params: Record<string, string | number> = {};
  if (weekOf) params.weekOf = weekOf;
  if (employeeId != null) params.employeeId = employeeId;

  const response = await axios.get(`${apiBase}/api/entries/week`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    params: Object.keys(params).length > 0 ? params : undefined,
  });
  return response.data.entries;
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
  const accessToken = await acquireTokenSilent([protectedResources.timesheetApi.scope]);
  const apiBase = import.meta.env.VITE_API_URL;
  const params = employeeId != null ? { employeeId } : undefined;
  const response = await axios.post(`${apiBase}/api/entries`, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    params,
  });
  return response.data;
}

export async function updateEntry(entryId: number, payload: CreateEntryPayload, employeeId?: number): Promise<any> {
  const accessToken = await acquireTokenSilent([protectedResources.timesheetApi.scope]);
  const apiBase = import.meta.env.VITE_API_URL;
  const params = employeeId != null ? { employeeId } : undefined;
  const response = await axios.put(`${apiBase}/api/entries/${entryId}`, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    params,
  });
  return response.data;
}

export async function deleteEntry(entryId: number, employeeId?: number): Promise<any> {
  const accessToken = await acquireTokenSilent([protectedResources.timesheetApi.scope]);
  const apiBase = import.meta.env.VITE_API_URL;
  const params = employeeId != null ? { employeeId } : undefined;
  const response = await axios.delete(`${apiBase}/api/entries/${entryId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    params,
  });
  return response.data;
}