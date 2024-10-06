import { json } from "@remix-run/node";
import { getUserFromSession, refreshAccessToken } from "~/utils/session.server";

export async function authenticateUser(request: Request) {
  const userId = await getUserFromSession(request);

  if (!userId) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const newAccessToken = await refreshAccessToken(userId);

  if (!newAccessToken) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  session.set("accessToken", newAccessToken);

  return json(
    { message: "Token refreshed" },
    {
      headers: {
        "Set-Cookie": await sessionStorage.commitSession(session),
      },
    }
  );
}