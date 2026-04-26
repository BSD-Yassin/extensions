import { closeMainWindow, open } from "@vicinae/api";

export default async function OpenGitHub() {
  await open("https://github.com");
  await closeMainWindow();
}
