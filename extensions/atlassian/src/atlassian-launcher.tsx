import { Action, ActionPanel, getPreferenceValues, Icon, List, open } from "@vicinae/api";
import { useMemo, useState } from "react";

type Preferences = {
  jiraBaseUrl: string;
  confluenceBaseUrl: string;
};

export default function AtlassianLauncherCommand() {
  const prefs = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const query = searchText.trim();

  const links = useMemo(() => {
    const jiraBase = prefs.jiraBaseUrl.replace(/\/+$/, "");
    const confBase = prefs.confluenceBaseUrl.replace(/\/+$/, "");
    const jiraSearch = `${jiraBase}/issues/?jql=text~"${encodeURIComponent(query)}"`;
    const confSearch = `${confBase}/dosearchsite.action?queryString=${encodeURIComponent(query)}`;
    const jiraIssue = `${jiraBase}/browse/${query.toUpperCase()}`;
    return [
      { title: "Search Jira", url: query ? jiraSearch : `${jiraBase}/jira/your-work`, icon: Icon.MagnifyingGlass },
      { title: "Search Confluence", url: query ? confSearch : `${confBase}/home`, icon: Icon.Document },
      { title: "Open Jira Issue Key", url: jiraIssue, icon: Icon.Bug }
    ];
  }, [prefs.confluenceBaseUrl, prefs.jiraBaseUrl, query]);

  return (
    <List searchText={searchText} onSearchTextChange={setSearchText} searchBarPlaceholder="Query or Jira issue key...">
      {links.map((link) => (
        <List.Item
          key={link.title}
          title={link.title}
          subtitle={query || "no query"}
          icon={link.icon}
          actions={
            <ActionPanel>
              <Action title={link.title} onAction={() => open(link.url)} />
              <Action.CopyToClipboard title="Copy URL" content={link.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
