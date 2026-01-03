import { acquireTokenSilent } from "../auth/msalConfig";
import axios from "axios";
import type { AxiosResponse } from "axios";

const BASE_URL = "http://localhost:3000/timesheet";

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
    const accessToken = await acquireTokenSilent(["timesheetApi"]);

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