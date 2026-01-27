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
): Promise<void> {
  try {
    // Acquire access token
    const accessToken = await acquireTokenSilent([protectedResources.timesheetApi.scope]);

    // Make the POST request to the backend
    await axios.post(
      LOGIN_URL,
      { firstName, lastName, email, object_id },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
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