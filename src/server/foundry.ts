import "server-only";
import OpenAI from "openai";
import { z } from "zod";
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
const responseSchema = z.object({
  kind: z.enum([
    "clarification",
    "recommendation",
    "cannot-match",
    "safety-escalation",
    "tool-call-request",
  ]),
  question: z.string().nullable(),
  answers: z.array(z.string()),
  serviceIds: z.array(z.string()),
  explanation: z.string().nullable(),
  workshopNotes: z.string().nullable(),
  uncertainty: z.string().nullable(),
  reason: z.string().nullable(),
  message: z.string().nullable(),
  tool: z.enum(["vehicle", "catalogue"]).nullable(),
  input: z.unknown().nullable(),
});
type FoundryResponse = z.infer<typeof responseSchema>;

const responseJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    kind: {
      type: "string",
      enum: [
        "clarification",
        "recommendation",
        "cannot-match",
        "safety-escalation",
        "tool-call-request",
      ],
    },
    question: { type: ["string", "null"] },
    answers: { type: "array", items: { type: "string" } },
    serviceIds: { type: "array", items: { type: "string" } },
    explanation: { type: ["string", "null"] },
    workshopNotes: { type: ["string", "null"] },
    uncertainty: { type: ["string", "null"] },
    reason: { type: ["string", "null"] },
    message: { type: ["string", "null"] },
    tool: { type: ["string", "null"], enum: ["vehicle", "catalogue", null] },
    input: {
      type: ["object", "null"],
      properties: {},
      additionalProperties: false,
    },
  },
  required: [
    "kind",
    "question",
    "answers",
    "serviceIds",
    "explanation",
    "workshopNotes",
    "uncertainty",
    "reason",
    "message",
    "tool",
    "input",
  ],
} as const;

function foundryConfig() {
  const endpoint = process.env.FOUNDRY_PROJECT_ENDPOINT?.trim();
  const deployment = process.env.FOUNDRY_MODEL_DEPLOYMENT?.trim();
  const apiKey = process.env.FOUNDRY_API_KEY?.trim();
  if (!endpoint || !deployment || !apiKey) {
    throw new Error("Foundry configuration is incomplete.");
  }
  return { endpoint: endpoint.replace(/\/$/, ""), deployment, apiKey };
}

function instructions(catalogueIds: string[], vehicleId?: string) {
  return [
    "You are a cautious service-navigation assistant for an automotive booking flow.",
    "Do not diagnose faults, infer repairs, or claim service eligibility.",
    "Safety escalation takes priority when the user describes loss of braking or steering control, or another immediate danger.",
    "Only recommend service IDs from the supplied catalogue IDs. If no verified match exists, return cannot-match.",
    "Ask a concise clarification question when the request is ambiguous.",
    "Never ask for or repeat the customer's name or email.",
    `Vehicle ID: ${vehicleId ?? "unknown"}`,
    `Catalogue IDs: ${catalogueIds.join(", ") || "none"}`,
    "Return only the JSON decision object matching the response schema.",
  ].join("\n");
}

function foundryClient() {
  const config = foundryConfig();
  return {
    config,
    client: new OpenAI({
      apiKey: config.apiKey,
      baseURL: `${config.endpoint}/openai/v1/`,
      defaultHeaders: { "api-key": config.apiKey },
      maxRetries: 0,
      timeout: 30_000,
    }),
  };
}

function toDecision(
  response: FoundryResponse,
  catalogueIds: string[],
): AssistantDecision {
  if (response.kind === "clarification") {
    return {
      kind: response.kind,
      question: response.question ?? "What would you like help with?",
      answers: response.answers,
      ...(response.uncertainty ? { uncertainty: response.uncertainty } : {}),
    };
  }
  if (response.kind === "recommendation") {
    const serviceIds = response.serviceIds.filter((id) =>
      catalogueIds.includes(id),
    );
    if (serviceIds.length === 0) {
      return {
        kind: "cannot-match",
        reason: "The model did not return a verified catalogue service.",
      };
    }
    return {
      kind: response.kind,
      serviceIds,
      explanation:
        response.explanation ??
        "Review this catalogue item before selecting it.",
      ...(response.workshopNotes
        ? { workshopNotes: response.workshopNotes }
        : {}),
      ...(response.uncertainty ? { uncertainty: response.uncertainty } : {}),
    };
  }
  if (response.kind === "cannot-match") {
    return {
      kind: response.kind,
      reason: response.reason ?? "No verified catalogue match was found.",
    };
  }
  if (response.kind === "safety-escalation") {
    return {
      kind: response.kind,
      message:
        response.message ??
        "Do not continue driving. Arrange appropriate roadside assistance or recovery.",
    };
  }
  return {
    kind: response.kind,
    tool: response.tool ?? "catalogue",
    input: response.input,
  };
}

async function requestFoundry(request: AssistantRequest) {
  const { client, config } = foundryClient();
  const response = await client.responses.create({
      model: config.deployment,
      instructions: instructions(request.catalogueIds, request.vehicleId),
      input: request.messages.map((message) => ({
        role: message.role,
        content: message.text,
      })),
      store: false,
      text: {
        format: {
          type: "json_schema",
          name: "assistant_decision",
          strict: true,
          schema: responseJsonSchema,
        },
      },
    });
  return toDecision(
    responseSchema.parse(JSON.parse(response.output_text)),
    request.catalogueIds,
  );
}

export function foundryReadiness() {
  const required = [
    "FOUNDRY_PROJECT_ENDPOINT",
    "FOUNDRY_MODEL_DEPLOYMENT",
    "FOUNDRY_API_KEY",
  ] as const;
  const missing = required.filter((key) => !process.env[key]);
  return { ready: missing.length === 0, missing };
}
export const foundryProvider: AiProvider = {
  async respond(request) {
    return requestFoundry(request);
  },
  async testConnectivity() {
    const status = foundryReadiness();
    if (!status.ready)
      return { ready: false, message: `Not configured: ${status.missing.join(", ")}` };
    try {
      const { client, config } = foundryClient();
      await client.responses.create({
        model: config.deployment,
        input: "Reply with the single word OK.",
        store: false,
        max_output_tokens: 16,
      });
      return { ready: true, message: "Foundry connectivity is available." };
    } catch {
      return { ready: false, message: "Foundry connectivity failed." };
    }
  },
};
