import { Action, ActionPanel, Icon, List, open } from "@vicinae/api";
import { useMemo, useState } from "react";

export default function EcosiaSearchCommand() {
  const [searchText, setSearchText] = useState("");
  const query = searchText.trim();

  const searchUrl = useMemo(() => {
    if (!query) return "https://www.ecosia.org/";
    return `https://www.ecosia.org/search?q=${encodeURIComponent(query)}`;
  }, [query]);

  return (
    <List searchText={searchText} onSearchTextChange={setSearchText} searchBarPlaceholder="Search Ecosia...">
      <List.Item
        title={query ? `Search Ecosia for "${query}"` : "Open Ecosia"}
        icon={Icon.Globe}
        actions={
          <ActionPanel>
            <Action title="Open Ecosia Search" icon={Icon.MagnifyingGlass} onAction={() => open(searchUrl)} />
            <Action.CopyToClipboard title="Copy Search URL" content={searchUrl} />
          </ActionPanel>
        }
      />
    </List>
  );
}
