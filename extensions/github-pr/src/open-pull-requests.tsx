import { Action, ActionPanel, getPreferenceValues, Icon, List, open } from "@vicinae/api";
import { useMemo, useState } from "react";

type Preferences = {
  defaultRepo?: string;
};

export default function OpenPullRequests() {
  const prefs = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState(prefs.defaultRepo ?? "");
  const repo = searchText.trim();

  const repoUrl = useMemo(() => {
    if (!repo) return "https://github.com";
    return `https://github.com/${repo}`;
  }, [repo]);

  const prsUrl = useMemo(() => {
    if (!repo) return "https://github.com/pulls";
    return `https://github.com/${repo}/pulls`;
  }, [repo]);

  return (
    <List searchText={searchText} onSearchTextChange={setSearchText} searchBarPlaceholder="owner/repo">
      <List.Item
        title="Open Repository"
        subtitle={repo || "GitHub home"}
        icon={Icon.Code}
        actions={
          <ActionPanel>
            <Action title="Open Repository" onAction={() => open(repoUrl)} />
            <Action.CopyToClipboard title="Copy Repository URL" content={repoUrl} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Open Pull Requests"
        subtitle={repo || "Global PRs"}
        icon={Icon.TwoPeople}
        actions={
          <ActionPanel>
            <Action title="Open Pull Requests" onAction={() => open(prsUrl)} />
            <Action.CopyToClipboard title="Copy PR URL" content={prsUrl} />
          </ActionPanel>
        }
      />
    </List>
  );
}
