import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function Home() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session_id')?.value || cookieStore.get('Session_id')?.value;

  if (sessionToken) {
    redirect("/dashboard");
  } else {
    redirect("/landing");
  }
}
