import { useState, useEffect, useCallback } from "react";
import { Action, ActionPanel, closeMainWindow, Icon, List, runInTerminal, showToast, Toast, getPreferenceValues, LocalStorage } from "@vicinae/api";
import { execFileSync } from "node:child_process";

type TailPeer = {
  ID?: string;
  DNSName?: string;
  HostName?: string;
  TailscaleIPs?: string[];
  Online?: boolean;
  OS?: string;
  User?: string;
  Tags?: string[];
  UserID?: number;
};

type TailStatus = {
  Self?: TailPeer;
  Peer?: Record<string, TailPeer>;
};

type Host = {
  name: string;
  target: string;
  ip: string;
  online: boolean;
  os?: string;
  user?: string;
  dnsName?: string;
  tags?: string[];
};

const CACHE_KEY = "tailscale-status";
const CACHE_TIMESTAMP_KEY = "tailscale-status-timestamp";

function getCacheExpiry(): number {
  const prefs = getPreferenceValues<{ "refresh-interval"?: string }>();
  const minutes = parseInt(prefs["refresh-interval"] ?? "5") || 5;
  return minutes * 60 * 1000;
}

function readStatus(): TailStatus {
  try {
    const raw = execFileSync("tailscale", ["status", "--json"], { encoding: "utf8" });
    return JSON.parse(raw) as TailStatus;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(message);
  }
}

function parseHosts(status: TailStatus): Host[] {
  const hosts: Host[] = [];

  if (status.Self) {
    hosts.push({
      name: status.Self.HostName ?? "This device",
      target: status.Self.HostName ?? status.Self.TailscaleIPs?.[0] ?? "",
      ip: status.Self.TailscaleIPs?.[0] ?? "",
      online: status.Self.Online ?? false,
      os: status.Self.OS,
      user: status.Self.User,
      dnsName: status.Self.DNSName,
      tags: status.Self.Tags,
    });
  }

  for (const peer of Object.values(status.Peer ?? {})) {
    const name = peer.HostName ?? peer.DNSName ?? "unknown-peer";
    const target = peer.HostName ?? peer.DNSName ?? peer.TailscaleIPs?.[0] ?? "";
    if (target) {
      hosts.push({
        name,
        target,
        ip: peer.TailscaleIPs?.[0] ?? "",
        online: peer.Online ?? false,
        os: peer.OS,
        user: peer.User,
        dnsName: peer.DNSName,
        tags: peer.Tags,
      });
    }
  }

  return hosts.sort((a, b) => Number(b.online) - Number(a.online));
}

export default function TailscaleStatusCommand({ query }: { query?: string }) {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterOS, setFilterOS] = useState<string>("all");
  const [filterTag, setFilterTag] = useState<string>("all");
  const [filterOnline, setFilterOnline] = useState<string>("all");
  const [searchText, setSearchText] = useState<string>(query || "");

  const preferences = getPreferenceValues<{ "refresh-interval"?: string }>();

  const allOS = Array.from(new Set(hosts.map((h) => h.os).filter(Boolean)));
  const allTags = Array.from(new Set(hosts.flatMap((h) => (h.tags || []).map((t) => t.replace("tag:", "")))));

  const filteredHosts = hosts.filter((h) => {
    if (filterOS !== "all" && h.os !== filterOS) return false;
    if (filterTag !== "all" && !(h.tags || []).some((t) => t.replace("tag:", "") === filterTag)) return false;
    if (filterOnline === "online" && !h.online) return false;
    if (filterOnline === "offline" && h.online) return false;
    if (searchText) {
      const query = searchText.toLowerCase();
      const matchesName = h.name.toLowerCase().includes(query);
      const matchesIP = h.ip.toLowerCase().includes(query);
      const matchesDNS = h.dnsName?.toLowerCase().includes(query);
      const matchesTag = (h.tags || []).some((t) => t.toLowerCase().includes(query));
      const matchesOS = h.os?.toLowerCase().includes(query);
      if (!matchesName && !matchesIP && !matchesDNS && !matchesTag && !matchesOS) return false;
    }
    return true;
  });

  const loadStatus = useCallback(async () => {
    try {
      const cached = await LocalStorage.getItem(CACHE_KEY);
      const timestamp = await LocalStorage.getItem(CACHE_TIMESTAMP_KEY);
      const now = Date.now();
      const cacheExpiry = getCacheExpiry();

      if (cached && timestamp && now - parseInt(timestamp as string) < cacheExpiry) {
        const parsed = JSON.parse(cached as string) as Host[];
        setHosts(parsed);
        setIsLoading(false);
        return;
      }

      const status = readStatus();
      const parsed = parseHosts(status);
      await LocalStorage.setItem(CACHE_KEY, JSON.stringify(parsed));
      await LocalStorage.setItem(CACHE_TIMESTAMP_KEY, now.toString());
      setHosts(parsed);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get Tailscale status");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const status = readStatus();
      const parsed = parseHosts(status);
      const now = Date.now();
      await LocalStorage.setItem(CACHE_KEY, JSON.stringify(parsed));
      await LocalStorage.setItem(CACHE_TIMESTAMP_KEY, now.toString());
      setHosts(parsed);
      setError(null);
    } catch (err) {
      console.error("Failed to refresh status:", err);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    const refreshMinutes = parseInt(preferences["refresh-interval"] ?? "5") || 5;
    const interval = setInterval(fetchStatus, refreshMinutes * 60 * 1000);
    return () => clearInterval(interval);
  }, [preferences, fetchStatus]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search by name, IP, DNS, tag, or OS..."
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <>
          <List.Dropdown tooltip="Filter by OS" value={filterOS} onChange={setFilterOS}>
            <List.Dropdown.Item title="All OS" value="all" />
            {allOS.map((os) => (
              <List.Dropdown.Item key={os} title={os} value={os} />
            ))}
          </List.Dropdown>
          <List.Dropdown tooltip="Filter by Tag" value={filterTag} onChange={setFilterTag}>
            <List.Dropdown.Item title="All Tags" value="all" />
            {allTags.map((tag) => (
              <List.Dropdown.Item key={tag} title={tag} value={tag} />
            ))}
          </List.Dropdown>
          <List.Dropdown tooltip="Filter by Status" value={filterOnline} onChange={setFilterOnline}>
            <List.Dropdown.Item title="All" value="all" />
            <List.Dropdown.Item title="Online" value="online" />
            <List.Dropdown.Item title="Offline" value="offline" />
          </List.Dropdown>
        </>
      }
    >
      {error && hosts.length === 0 ? (
        <List.EmptyView title="Error" description={error} icon={Icon.XMarkCircle} />
      ) : (
        <>
          <List.Section title="Self">
            {hosts.slice(0, 1).map((host) => (
              <List.Item
                key={host.name}
                title={host.name}
                subtitle={host.ip}
                icon={Icon.Circle}
                accessories={[{ tag: host.online ? "online" : "offline" }]}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser title="Open Tailscale Admin" url="https://login.tailscale.com/admin/machines" />
                    <Action.CopyToClipboard title="Copy IP" content={host.ip} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
          <List.Section title="Peers">
            {filteredHosts.slice(1).map((host) => {
              const detailMarkdown = [
                `# ${host.name}`,
                "",
                `- Online: ${host.online ? "yes" : "no"}`,
                `- IP: ${host.ip || "-"}`,
                `- DNS: ${host.dnsName || "-"}`,
                `- OS: ${host.os || "-"}`,
                `- Tags: ${(host.tags || []).join(", ") || "-"}`,
              ].join("\n");
              return (
                <List.Item
                  key={host.target}
                  title={host.name}
                  subtitle={host.ip}
                  icon={host.online ? Icon.CheckCircle : Icon.XMarkCircle}
                  detail={<List.Item.Detail markdown={detailMarkdown} />}
                  accessories={[
                    { tag: host.online ? "online" : "offline" },
                    ...(host.tags?.map((tag) => ({ tag: tag.replace("tag:", "") })) || []),
                    ...(host.os ? [{ text: host.os }] : []),
                  ]}
                  actions={
                    <ActionPanel>
                      <Action
                        title="SSH"
                        icon={Icon.Terminal}
                        onAction={async () => {
                          if (!host.target) {
                            await showToast({
                              style: Toast.Style.Failure,
                              title: "No SSH target available",
                            });
                            return;
                          }
                          await runInTerminal(["ssh", host.target]);
                          await closeMainWindow();
                        }}
                      />
                      <Action.OpenInBrowser
                        title="Open in Admin"
                        url={`https://login.tailscale.com/admin/machines/${host.ip}`}
                      />
                      <Action.CopyToClipboard title="Copy Hostname" content={host.target} />
                      <Action.CopyToClipboard title="Copy IP" content={host.ip} />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        </>
      )}
    </List>
  );
}