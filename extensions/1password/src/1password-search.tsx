import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  getPreferenceValues,
  Icon,
  List,
  open,
  showToast,
  Toast,
} from "@vicinae/api";
import { execFileSync } from "node:child_process";
import { useMemo, useState } from "react";

type Preferences = { opPath?: string };
type OpItem = { id: string; title: string; vault?: { name?: string } };

function loadItems(opPath: string): OpItem[] {
  try {
    const raw = execFileSync(opPath, ["item", "list", "--format", "json"], { encoding: "utf8" });
    return JSON.parse(raw) as OpItem[];
  } catch {
    showToast({
      style: Toast.Style.Failure,
      title: "1Password CLI unavailable",
      message: "Run `op signin` and ensure the CLI is installed",
    });
    return [];
  }
}

function getItemField(opPath: string, itemId: string, field: "password" | "username"): string {
  const raw = execFileSync(opPath, ["item", "get", itemId, "--reveal", "--fields", field], { encoding: "utf8" });
  return raw.trim();
}

export default function OnePasswordSearchCommand() {
  const prefs = getPreferenceValues<Preferences>();
  const opPath = prefs.opPath?.trim() || "op";
  const [searchText, setSearchText] = useState("");
  const all = loadItems(opPath);

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return all;
    return all.filter((item) => item.title.toLowerCase().includes(q) || item.vault?.name?.toLowerCase().includes(q));
  }, [all, searchText]);

  return (
    <List searchText={searchText} onSearchTextChange={setSearchText} searchBarPlaceholder="Search 1Password items...">
      {filtered.map((item) => (
        <List.Item
          key={item.id}
          title={item.title}
          subtitle={item.vault?.name ?? ""}
          icon={Icon.Key}
          actions={
            <ActionPanel>
              <Action title="Open 1Password Web Vault" onAction={() => open("https://my.1password.com/")} />
              <Action
                title="Copy Password"
                onAction={async () => {
                  try {
                    const value = getItemField(opPath, item.id, "password");
                    if (!value) {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "No password field found",
                        message: item.title,
                      });
                      return;
                    }
                    await Clipboard.copy(value);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Password copied",
                      message: item.title,
                    });
                    await closeMainWindow();
                  } catch (error) {
                    const message = error instanceof Error ? error.message : "Unknown error";
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to copy password",
                      message,
                    });
                  }
                }}
              />
              <Action
                title="Copy Username"
                onAction={async () => {
                  try {
                    const value = getItemField(opPath, item.id, "username");
                    if (!value) {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "No username field found",
                        message: item.title,
                      });
                      return;
                    }
                    await Clipboard.copy(value);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Username copied",
                      message: item.title,
                    });
                    await closeMainWindow();
                  } catch (error) {
                    const message = error instanceof Error ? error.message : "Unknown error";
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to copy username",
                      message,
                    });
                  }
                }}
              />
              <Action.CopyToClipboard title="Copy Item ID" content={item.id} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
