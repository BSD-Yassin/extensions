import { Action, ActionPanel, getPreferenceValues, Icon, List, open } from "@vicinae/api";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";

type Preferences = {
  defaultRegion?: string;
};

type Profile = {
  name: string;
  region: string;
};

const SERVICES = [
  { name: "EC2", path: "/ec2/home" },
  { name: "ECS", path: "/ecs/home" },
  { name: "ECR", path: "/ecr/repositories" },
  { name: "Lambda", path: "/lambda/home" },
  { name: "CloudWatch", path: "/cloudwatch/home" },
  { name: "S3", path: "/s3/home" },
  { name: "SSM", path: "/systems-manager/parameters" },
  { name: "Secrets Manager", path: "/secretsmanager/listsecrets" }
];

function parseProfiles(defaultRegion: string): Profile[] {
  const configPath = `${homedir()}/.aws/config`;
  let raw = "";
  try {
    raw = readFileSync(configPath, "utf8");
  } catch {
    return [{ name: "default", region: defaultRegion }];
  }

  const lines = raw.split("\n");
  const profiles: Profile[] = [];
  let current = "default";
  let region = defaultRegion;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      if (current) profiles.push({ name: current, region });
      const section = trimmed.slice(1, -1).replace("profile ", "");
      current = section || "default";
      region = defaultRegion;
      continue;
    }
    if (trimmed.startsWith("region")) {
      const value = trimmed.split("=").map((x) => x.trim())[1];
      if (value) region = value;
    }
  }

  if (current) profiles.push({ name: current, region });
  return profiles.filter((profile, idx, arr) => arr.findIndex((p) => p.name === profile.name) === idx);
}

export default function AwsConsoleCommand() {
  const prefs = getPreferenceValues<Preferences>();
  const defaultRegion = prefs.defaultRegion?.trim() || "eu-west-1";
  const profiles = parseProfiles(defaultRegion);

  return (
    <List searchBarPlaceholder="Search AWS profiles...">
      {profiles.map((profile) => (
        <List.Item
          key={profile.name}
          title={profile.name}
          subtitle={profile.region}
          icon={Icon.Cloud}
          actions={
            <ActionPanel>
              {SERVICES.map((service) => {
                const url = `https://${profile.region}.console.aws.amazon.com${service.path}?region=${profile.region}`;
                return <Action key={service.name} title={`Open ${service.name}`} onAction={() => open(url)} />;
              })}
              <Action.CopyToClipboard title="Copy Profile Name" content={profile.name} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
