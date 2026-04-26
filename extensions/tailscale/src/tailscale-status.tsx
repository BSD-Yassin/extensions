import { Action, ActionPanel, Icon, List, open, showToast, Toast } from "@vicinae/api";
import { execFileSync } from "node:child_process";

type TailPeer = {
  DNSName?: string;
  HostName?: string;
  TailscaleIPs?: string[];
  Online?: boolean;
};

type TailStatus = {
  Self?: TailPeer;
  Peer?: Record<string, TailPeer>;
};

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
  const peers = Object.values(status.Peer ?? {});

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
          const ip = peer.TailscaleIPs?.[0] ?? "";
          return (
            <List.Item
              key={`${title}-${ip}`}
              title={title}
              subtitle={ip}
              icon={peer.Online ? Icon.CheckCircle : Icon.XMarkCircle}
              accessories={[{ tag: peer.Online ? "online" : "offline" }]}
              actions={
                <ActionPanel>
                  <Action title="SSH Peer" icon={Icon.Terminal} onAction={() => open(`ssh://${ip}`)} />
                  <Action.CopyToClipboard title="Copy IP" content={ip} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
