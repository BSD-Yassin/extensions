import { Action, ActionPanel, getPreferenceValues, Icon, List, open, showToast, Toast } from "@vicinae/api";
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
              <Action.CopyToClipboard title="Copy Item ID" content={item.id} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
