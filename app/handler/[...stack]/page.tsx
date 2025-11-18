import { redirect } from "next/navigation";

export default function StackHandlerRedirect() {
  redirect("/auth/sign-in");
}
