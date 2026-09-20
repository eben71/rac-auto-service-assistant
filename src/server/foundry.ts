import "server-only";
import type { AssistantMessage } from "@/domain/models";

export interface AssistantRequest {
  messages: AssistantMessage[];
  vehicleId?: string;
  catalogueIds: string[];
}
export type AssistantDecision =
  | {
      kind: "clarification";
      question: string;
      answers: string[];
      uncertainty?: string;
    }
  | {
      kind: "recommendation";
      serviceIds: string[];
      explanation: string;
      workshopNotes?: string;
      uncertainty?: string;
    }
  | { kind: "cannot-match"; reason: string }
  | { kind: "safety-escalation"; message: string }
  | {
      kind: "tool-call-request";
      tool: "vehicle" | "catalogue";
      input: unknown;
    };
export interface AiProvider {
  respond(request: AssistantRequest): Promise<AssistantDecision>;
  testConnectivity(): Promise<{ ready: boolean; message: string }>;
}
export function foundryReadiness() {
  const required = [
    "FOUNDRY_PROJECT_ENDPOINT",
    "FOUNDRY_MODEL_DEPLOYMENT",
    "FOUNDRY_API_SURFACE",
    "FOUNDRY_AUTH_CONFIGURATION",
  ] as const;
  const missing = required.filter((key) => !process.env[key]);
  return { ready: missing.length === 0, missing };
}
export const foundryProvider: AiProvider = {
  async respond() {
    throw new Error(
      "Foundry integration is not implemented. Approved resource, API surface and authentication details are required.",
    );
  },
  async testConnectivity() {
    const status = foundryReadiness();
    return {
      ready: false,
      message: status.ready
        ? "Configuration present; connectivity test awaits approved API integration."
        : `Not configured: ${status.missing.join(", ")}`,
    };
  },
};
