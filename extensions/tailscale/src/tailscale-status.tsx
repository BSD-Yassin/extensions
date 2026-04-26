import { Action, ActionPanel, closeMainWindow, Detail, Icon, List, runInTerminal, showToast, Toast } from "@vicinae/api";
import { execFileSync } from "node:child_process";

type TailPeer = {
  ID?: string;
  DNSName?: string;
  HostName?: string;
  TailscaleIPs?: string[];
  Online?: boolean;
  OS?: string;
  User?: string;
};

type TailStatus = {
  Self?: TailPeer;
  Peer?: Record<string, TailPeer>;
};

function readWhois(ip: string): string {
  if (!ip) return "No Tailscale IP found for this peer.";
  try {
    const raw = execFileSync("tailscale", ["whois", "--json", ip], { encoding: "utf8" });
    return `\`\`\`json\n${raw}\n\`\`\``;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return `Failed to run tailscale whois for ${ip}\n\n${message}`;
  }
}

function readStatus(): TailStatus {
  try {
    const raw = execFileSync("tailscale", ["status", "--json"], { encoding: "utf8" });
    return JSON.parse(raw) as TailStatus;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    showToast({
      style: Toast.Style.Failure,
      title: "tailscale is unavailable",
      message: "Install tailscale and ensure tailscaled is running",
    });
    throw new Error(message);
  }
}

export default function TailscaleStatusCommand() {
  const status = readStatus();
  const peers = Object.values(status.Peer ?? {}).sort((a, b) => Number(Boolean(b.Online)) - Number(Boolean(a.Online)));

  return (
    <List searchBarPlaceholder="Search Tailscale peers...">
      <List.Section title="Self">
        <List.Item
          title={status.Self?.HostName ?? "This device"}
          subtitle={status.Self?.TailscaleIPs?.[0] ?? ""}
          icon={Icon.Circle}
          accessories={[{ tag: status.Self?.Online ? "online" : "offline" }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Tailscale Admin" url="https://login.tailscale.com/admin/machines" />
              <Action.CopyToClipboard title="Copy IP" content={status.Self?.TailscaleIPs?.[0] ?? ""} />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Peers">
        {peers.map((peer) => {
          const title = peer.HostName ?? peer.DNSName ?? "unknown-peer";
          const hostForSsh = peer.HostName ?? peer.DNSName ?? "";
          const ip = peer.TailscaleIPs?.[0] ?? "";
          const target = hostForSsh || ip;
          const detailMarkdown = [
            `# ${title}`,
            "",
            `- Online: ${peer.Online ? "yes" : "no"}`,
            `- IP: ${ip || "-"}`,
            `- DNS: ${peer.DNSName || "-"}`,
            `- OS: ${peer.OS || "-"}`,
            `- User: ${peer.User || "-"}`,
          ].join("\n");
          return (
            <List.Item
              key={`${title}-${ip}`}
              title={title}
              subtitle={ip}
              icon={peer.Online ? Icon.CheckCircle : Icon.XMarkCircle}
              detail={<List.Item.Detail markdown={detailMarkdown} />}
              accessories={[{ tag: peer.Online ? "online" : "offline" }]}
              actions={
                <ActionPanel>
                  <Action
                    title="SSH"
                    icon={Icon.Terminal}
                    onAction={async () => {
                      if (!target) {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "No SSH target available",
                          message: "This peer has no hostname or IP",
                        });
                        return;
                      }
                      await runInTerminal(["ssh", target]);
                      await closeMainWindow();
                    }}
                  />
                  <Action
                    title="SSH as root"
                    icon={Icon.Terminal}
                    onAction={async () => {
                      if (!target) {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "No SSH target available",
                          message: "This peer has no hostname or IP",
                        });
                        return;
                      }
                      await runInTerminal(["ssh", `root@${target}`]);
                      await closeMainWindow();
                    }}
                  />
                  <Action
                    title="Ping Peer"
                    icon={Icon.Globe}
                    onAction={async () => {
                      if (!ip) {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "No IP available",
                          message: "Cannot ping a peer without an IP",
                        });
                        return;
                      }
                      await runInTerminal(["ping", ip]);
                      await closeMainWindow();
                    }}
                  />
                  <Action.Push
                    title="Whois (JSON)"
                    icon={Icon.Document}
                    target={<Detail markdown={readWhois(ip)} />}
                  />
                  <Action.CopyToClipboard title="Copy Hostname" content={hostForSsh} />
                  <Action.CopyToClipboard title="Copy IP" content={ip} />
                  <Action.CopyToClipboard title="Copy DNS Name" content={peer.DNSName ?? ""} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
