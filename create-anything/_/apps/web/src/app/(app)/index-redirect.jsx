import { redirect } from "react-router";

export function loader() {
  return redirect("/welcome");
}

export default function IndexRedirect() {
  return null;
}
