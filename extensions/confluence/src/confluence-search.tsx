import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  Icon,
  List,
  LocalStorage,
  open,
  showToast,
  Toast,
} from "@vicinae/api";
import { useEffect, useMemo, useState } from "react";

type Preferences = {
  confluenceBaseUrl: string;
};

export default function ConfluenceSearchCommand() {
  const prefs = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const [configuredBaseUrl, setConfiguredBaseUrl] = useState("");
  const query = searchText.trim();
  const base = (configuredBaseUrl || prefs.confluenceBaseUrl || "").trim().replace(/\/+$/, "");
  const hasBase = base.length > 0;

  useEffect(() => {
    LocalStorage.getItem<string>("confluence.baseUrl").then((saved) => {
      if (saved?.trim()) setConfiguredBaseUrl(saved.trim());
    });
  }, []);

  const searchUrl = useMemo(() => {
    if (!query) return `${base}/home`;
    return `${base}/dosearchsite.action?queryString=${encodeURIComponent(query)}`;
  }, [base, query]);

  return (
    <List searchText={searchText} onSearchTextChange={setSearchText} searchBarPlaceholder="Search Confluence...">
      {!hasBase && (
        <List.Item
          title="Configure Confluence Base URL"
          subtitle="Saved locally for this extension"
          icon={Icon.Gear}
          actions={
            <ActionPanel>
              <Action.Push
                title="Set Confluence Base URL"
                target={
                  <Form
                    actions={
                      <ActionPanel>
                        <Action.SubmitForm
                          title="Save"
                          onSubmit={async (values) => {
                            const baseUrl = String(values.baseUrl ?? "").trim();
                            if (!baseUrl) {
                              await showToast({ style: Toast.Style.Failure, title: "Base URL is required" });
                              return;
                            }
                            await LocalStorage.setItem("confluence.baseUrl", baseUrl);
                            setConfiguredBaseUrl(baseUrl);
                            await showToast({ style: Toast.Style.Success, title: "Confluence base URL saved" });
                          }}
                        />
                      </ActionPanel>
                    }
                  >
                    <Form.TextField
                      id="baseUrl"
                      title="Confluence Base URL"
                      placeholder="https://yourorg.atlassian.net/wiki"
                      defaultValue={configuredBaseUrl || prefs.confluenceBaseUrl || ""}
                    />
                  </Form>
                }
              />
            </ActionPanel>
          }
        />
      )}
      {hasBase && (
      <List.Item
        title="Search Confluence"
        subtitle={query || "no query"}
        icon={Icon.Document}
        actions={
          <ActionPanel>
            <Action title="Open Confluence Search" onAction={() => open(searchUrl)} />
            <Action.CopyToClipboard title="Copy Search URL" content={searchUrl} />
          </ActionPanel>
        }
      />
      )}
    </List>
  );
}
