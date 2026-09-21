import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Vehicle } from "../domain/models";
import { profileVehicles } from "../domain/profile-fixtures";

export interface DeveloperProfile {
  id: string;
  displayName: string;
  email: string;
  savedVehicles: Vehicle[];
}
interface Store {
  garages: Record<string, Vehicle[]>;
  sessions: Record<string, string>;
}
const filePath = () =>
  process.env.DEMO_PROFILE_DATA_PATH ??
  path.join(process.cwd(), ".local-data", "profiles.json");
const empty = (): Store => ({ garages: {}, sessions: {} });
export function configuredDevelopers() {
  return [1, 2, 3].flatMap((index) => {
    const email =
      process.env[`DEMO_DEVELOPER_${index}_EMAIL`]?.trim().toLowerCase() ?? "";
    const displayName =
      process.env[`DEMO_DEVELOPER_${index}_NAME`]?.trim() ?? "";
    return /^[a-z0-9._%+-]+@rac\.com\.au$/.test(email) && displayName
      ? [
          {
            id: `developer-${index}`,
            email,
            displayName,
            initialVehicle: profileVehicles[index - 1],
          },
        ]
      : [];
  });
}
async function load(): Promise<Store> {
  try {
    const data = JSON.parse(
      await readFile(/* turbopackIgnore: true */ filePath(), "utf8"),
    ) as Store;
    return data.garages && data.sessions ? data : empty();
  } catch {
    return empty();
  }
}
async function save(data: Store) {
  const file = filePath();
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${randomBytes(8).toString("hex")}.tmp`;
  await writeFile(temporary, JSON.stringify(data, null, 2), { mode: 0o600 });
  await rename(temporary, file);
}
export async function signIn(email: string): Promise<string | null> {
  const developer = configuredDevelopers().find(
    (item) => item.email === email.trim().toLowerCase(),
  );
  if (!developer) return null;
  const data = await load();
  data.garages[developer.id] ??= [developer.initialVehicle];
  const token = randomBytes(32).toString("hex");
  data.sessions[token] = developer.id;
  await save(data);
  return token;
}
export async function profileForToken(
  token: string | undefined,
): Promise<DeveloperProfile | null> {
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  const data = await load();
  const developer = configuredDevelopers().find(
    (item) => item.id === data.sessions[token],
  );
  if (!developer) return null;
  return {
    id: developer.id,
    email: developer.email,
    displayName: developer.displayName,
    savedVehicles: data.garages[developer.id] ?? [developer.initialVehicle],
  };
}
export async function signOut(token: string | undefined) {
  if (!token) return;
  const data = await load();
  delete data.sessions[token];
  await save(data);
}
export async function updateGarage(
  token: string | undefined,
  operation: "add" | "remove",
  vehicle: Vehicle,
): Promise<DeveloperProfile | null> {
  const profile = await profileForToken(token);
  if (!profile) return null;
  const data = await load();
  const vehicles = data.garages[profile.id] ?? [
    profileVehicles[Number(profile.id.at(-1)) - 1],
  ];
  const key = (item: Vehicle) =>
    item.vehicleId
      ? `autoquotes:${item.vehicleId}`
      : `${item.make.toLowerCase()}:${item.model.toLowerCase()}:${item.year ?? ""}`;
  const existing = vehicles.some((item) => key(item) === key(vehicle));
  data.garages[profile.id] =
    operation === "add"
      ? existing
        ? vehicles.map((item) => (key(item) === key(vehicle) ? vehicle : item))
        : [...vehicles, vehicle]
      : vehicles.filter((item) => key(item) !== key(vehicle));
  await save(data);
  return { ...profile, savedVehicles: data.garages[profile.id] };
}
