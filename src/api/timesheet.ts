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

    console.log("Login notification sent successfully!");
  } catch (error: any) {
    // Check if the error is an AxiosError
    if (axios.isAxiosError(error)) {
      console.error("Axios error:", error.response?.data || error.message);
    } else {
      console.error("Unexpected error:", error);
    }
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
    // Handle errors: Log and rethrow
    console.error("Error fetching timesheets:", error);
    throw new Error("Failed to retrieve timesheets");
  }
}