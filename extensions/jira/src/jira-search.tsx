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
import { appendFileSync } from "node:fs";

type Preferences = {
  jiraBaseUrl?: string;
  debugEnabled?: boolean;
  debugLogPath?: string;
};

function writeDebugLog(enabled: boolean, path: string, message: string, payload?: unknown) {
  if (!enabled) return;
  const now = new Date().toISOString();
  const suffix = payload ? ` ${JSON.stringify(payload)}` : "";
  try {
    appendFileSync(path, `[${now}] ${message}${suffix}\n`, { encoding: "utf8" });
  } catch {
    // Best-effort debug logging only.
  }
}

export default function JiraSearchCommand() {
  const prefs = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const [configuredBaseUrl, setConfiguredBaseUrl] = useState("");
  const debugEnabled = prefs.debugEnabled ?? false;
  const debugLogPath = (prefs.debugLogPath ?? "/tmp/vicinae-jira-extension.log").trim() || "/tmp/vicinae-jira-extension.log";
  const query = searchText.trim();
  const jiraBase = (configuredBaseUrl || prefs.jiraBaseUrl || "").trim().replace(/\/+$/, "");
  const hasBase = jiraBase.length > 0;

  writeDebugLog(debugEnabled, debugLogPath, "render", {
    queryLength: query.length,
    hasBase,
    baseSource: configuredBaseUrl ? "localStorage" : prefs.jiraBaseUrl ? "preferences" : "none",
  });

  useEffect(() => {
    writeDebugLog(debugEnabled, debugLogPath, "loading base URL from LocalStorage");
    LocalStorage.getItem<string>("jira.baseUrl").then((saved) => {
      const normalized = saved?.trim() ?? "";
      writeDebugLog(debugEnabled, debugLogPath, "loaded base URL from LocalStorage", {
        found: Boolean(normalized),
        valuePreview: normalized.slice(0, 60),
      });
      if (normalized) setConfiguredBaseUrl(normalized);
    });
  }, [debugEnabled, debugLogPath]);

  const issueUrl = useMemo(() => `${jiraBase}/browse/${query.toUpperCase()}`, [jiraBase, query]);
  const searchUrl = useMemo(() => {
    if (!query) return `${jiraBase}/jira/your-work`;
    return `${jiraBase}/issues/?jql=text~"${encodeURIComponent(query)}"`;
  }, [jiraBase, query]);

  return (
    <List searchText={searchText} onSearchTextChange={setSearchText} searchBarPlaceholder="Search text or issue key...">
      {!hasBase && (
        <List.Item
          title="Configure Jira Base URL"
          subtitle="Saved locally for this extension"
          icon={Icon.Gear}
          actions={
            <ActionPanel>
              <Action.Push
                title="Set Jira Base URL"
                target={
                  <Form
                    actions={
                      <ActionPanel>
                        <Action.SubmitForm
                          title="Save"
                          onSubmit={async (values) => {
                            const baseUrl = String(values.baseUrl ?? "").trim();
                            writeDebugLog(debugEnabled, debugLogPath, "submit base URL form", {
                              provided: Boolean(baseUrl),
                              valuePreview: baseUrl.slice(0, 60),
                            });
                            if (!baseUrl) {
                              await showToast({ style: Toast.Style.Failure, title: "Base URL is required" });
                              return;
                            }
                            await LocalStorage.setItem("jira.baseUrl", baseUrl);
                            writeDebugLog(debugEnabled, debugLogPath, "saved base URL to LocalStorage", {
                              valuePreview: baseUrl.slice(0, 60),
                            });
                            setConfiguredBaseUrl(baseUrl);
                            await showToast({ style: Toast.Style.Success, title: "Jira base URL saved" });
                          }}
                        />
                      </ActionPanel>
                    }
                  >
                    <Form.TextField
                      id="baseUrl"
                      title="Jira Base URL"
                      placeholder="https://yourorg.atlassian.net"
                      defaultValue={configuredBaseUrl || prefs.jiraBaseUrl || ""}
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
        title="Search Jira"
        subtitle={query || "no query"}
        icon={Icon.MagnifyingGlass}
        actions={
          <ActionPanel>
            <Action
              title="Open Jira Search"
              onAction={() => {
                writeDebugLog(debugEnabled, debugLogPath, "open jira search", { searchUrl });
                open(searchUrl);
              }}
            />
            <Action.CopyToClipboard title="Copy Search URL" content={searchUrl} />
          </ActionPanel>
        }
      />
      )}
      {hasBase && (
      <List.Item
        title="Open Jira Issue Key"
        subtitle={query || "enter issue key"}
        icon={Icon.Bug}
        actions={
          <ActionPanel>
            <Action
              title="Open Jira Issue"
              onAction={() => {
                writeDebugLog(debugEnabled, debugLogPath, "open jira issue", { issueUrl });
                open(issueUrl);
              }}
            />
            <Action.CopyToClipboard title="Copy Issue URL" content={issueUrl} />
          </ActionPanel>
        }
      />
      )}
    </List>
  );
}
