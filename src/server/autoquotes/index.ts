import "server-only";
import type { AutoQuotesAdapter } from "./contracts";
import { mockAutoQuotes } from "./mock";
import { realAutoQuotes } from "./real";
export function getAutoQuotesAdapter(): AutoQuotesAdapter {
  const provider = process.env.AUTOQUOTES_PROVIDER ?? "mock";
  if (provider === "mock") return mockAutoQuotes;
  if (provider === "real") return realAutoQuotes;
  throw new Error("Unknown AutoQuotes provider configuration.");
}
