import { handleStaff } from "@/lib/api-response";
import { listRequests } from "@/lib/front-desk";

export const dynamic = "force-dynamic";

/** Lists appointment requests for the review inbox. Staff only. */
export async function GET(req: Request) {
  const status = new URL(req.url).searchParams.get("status");
  return handleStaff((doctorId) => listRequests(doctorId, status));
}
