import { Action, ActionPanel, Icon, List, getPreferenceValues, open, showToast, Toast } from "@vicinae/api";
import { execFileSync } from "node:child_process";
import { useMemo, useState } from "react";

type Preferences = { bwPath?: string };
type BwItem = { id: string; name: string; login?: { username?: string } };

function loadItems(bwPath: string): BwItem[] {
  try {
    const raw = execFileSync(bwPath, ["list", "items"], { encoding: "utf8" });
    return JSON.parse(raw) as BwItem[];
  } catch {
    showToast({
      style: Toast.Style.Failure,
      title: "Bitwarden CLI unavailable",
      message: "Run `bw login` and `bw unlock` first",
    });
    return [];
  }
}

export default function BitwardenSearchCommand() {
  const prefs = getPreferenceValues<Preferences>();
  const bwPath = prefs.bwPath?.trim() || "bw";
  const [searchText, setSearchText] = useState("");
  const all = loadItems(bwPath);

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return all;
    return all.filter((item) => item.name.toLowerCase().includes(q) || item.login?.username?.toLowerCase().includes(q));
  }, [all, searchText]);

  return (
    <List searchText={searchText} onSearchTextChange={setSearchText} searchBarPlaceholder="Search Bitwarden items...">
      {filtered.map((item) => (
        <List.Item
          key={item.id}
          title={item.name}
          subtitle={item.login?.username ?? ""}
          icon={Icon.Lock}
          actions={
            <ActionPanel>
              <Action title="Open Bitwarden Web Vault" onAction={() => open("https://vault.bitwarden.com/")} />
              <Action.CopyToClipboard title="Copy Item ID" content={item.id} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
