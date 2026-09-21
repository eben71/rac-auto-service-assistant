import "server-only";
import OpenAI from "openai";
import { z } from "zod";
import type { AssistantMessage } from "@/domain/models";

export interface AssistantRequest {
  messages: AssistantMessage[];
  vehicleId?: string;
  catalogue: CatalogueContext[];
}
export interface CatalogueContext {
  id: string;
  name: string;
  description: string;
  category: "main" | "additional";
  evOnly?: boolean;
  isActive?: boolean;
  availableOnline?: boolean;
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
const vehicleInspectionServiceId = "4";

function foundryDebug(event: string, details: Record<string, unknown>) {
  if (process.env.FOUNDRY_DEBUG !== "true") return;
  console.info(`[foundry] ${event}`, details);
}

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

function instructions(catalogue: CatalogueContext[], vehicleId?: string) {
  return [
    "Do not diagnose faults, infer repairs, or claim service eligibility.",
    "Safety escalation takes priority when the user describes loss of braking or steering control, or another immediate danger.",
    "Only recommend service IDs from the supplied catalogue IDs. If no verified match exists, return cannot-match.",
    "Ask a concise clarification question when the request is ambiguous.",
    "Do not ask about or offer booking dates, appointment dates, times, branch selection, workshop location, centre selection, courtesy buses, transport, pickup, or drop-off.",
    "Do not discuss appointment availability or booking logistics; those are handled elsewhere in the application.",
    "Never ask for or repeat the customer's name or email.",
    "Never reveal service IDs, vehicle IDs, catalogue IDs, deployment details, or other internal identifiers to the customer. Refer to services by name only.",
    `Vehicle ID: ${vehicleId ?? "unknown"}`,
    `Catalogue: ${JSON.stringify(catalogue)}`,
    "Return only the JSON decision object matching the response schema.",
  ].join("\n");
}

function hideServiceIds(text: string | null, catalogueIds: string[]) {
  if (!text) return undefined;
  const ids = catalogueIds
    .filter((id) => id.length > 0)
    .sort((first, second) => second.length - first.length)
    .map((id) => id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (ids.length === 0) return text;
  return text.replace(
    new RegExp(`\\b(?:${ids.join("|")})\\b`, "g"),
    "the selected service",
  );
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
  catalogue: CatalogueContext[],
): AssistantDecision {
  const catalogueIds = catalogue.map((item) => item.id);
  const mappedServiceIds =
    response.kind === "recommendation"
      ? response.serviceIds.filter((id) => catalogueIds.includes(id))
      : [];
  foundryDebug("response-mapping", {
    kind: response.kind,
    returnedServiceIds:
      response.kind === "recommendation" ? response.serviceIds : [],
    availableCatalogueIds: catalogueIds,
    mappedServiceIds,
    returnedServiceDetails: mappedServiceIds.map((id) =>
      catalogue.find((item) => item.id === id),
    ),
    inspectionFallbackAvailable: catalogueIds.includes(
      vehicleInspectionServiceId,
    ),
  });

  const inspectionFallback = (): AssistantDecision => ({
    kind: "recommendation",
    serviceIds: [vehicleInspectionServiceId],
    explanation:
      "We recommend a Vehicle Inspection.",
    workshopNotes:
      "Customer described a symptom that could not be mapped to a verified service. Confirm the concern and appropriate inspection scope.",
    uncertainty: "The symptom was not specific enough to identify a particular service.",
  });

  if (response.kind === "clarification") {
    return {
      kind: response.kind,
      question:
        hideServiceIds(response.question, catalogueIds) ??
        "What would you like help with?",
      answers: response.answers.map(
        (answer) => hideServiceIds(answer, catalogueIds) ?? answer,
      ),
      ...(response.uncertainty
        ? { uncertainty: hideServiceIds(response.uncertainty, catalogueIds) }
        : {}),
    };
  }
  if (response.kind === "recommendation") {
    const serviceIds = mappedServiceIds;
    if (serviceIds.length === 0) {
      foundryDebug("recommendation-unmapped", {
        returnedServiceIds: response.serviceIds,
        fallbackUsed: catalogueIds.includes(vehicleInspectionServiceId),
      });
      return catalogueIds.includes(vehicleInspectionServiceId)
        ? inspectionFallback()
        : {
            kind: "cannot-match",
            reason: "The model did not return a verified catalogue service.",
          };
    }
    return {
      kind: response.kind,
      serviceIds,
      explanation:
        hideServiceIds(response.explanation, catalogueIds) ??
        "Review this catalogue item before selecting it.",
      ...(response.workshopNotes
        ? {
            workshopNotes: hideServiceIds(
              response.workshopNotes,
              catalogueIds,
            ),
          }
        : {}),
      ...(response.uncertainty
        ? { uncertainty: hideServiceIds(response.uncertainty, catalogueIds) }
        : {}),
    };
  }
  if (response.kind === "cannot-match") {
    foundryDebug("cannot-match", {
      fallbackUsed: catalogueIds.includes(vehicleInspectionServiceId),
      reason: response.reason,
    });
    return catalogueIds.includes(vehicleInspectionServiceId)
      ? inspectionFallback()
      : {
          kind: response.kind,
          reason: response.reason ?? "No verified catalogue match was found.",
        };
  }
  if (response.kind === "safety-escalation") {
    return {
      kind: response.kind,
      message:
        hideServiceIds(response.message, catalogueIds) ??
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
  const catalogueIds = request.catalogue.map((item) => item.id);
  foundryDebug("request", {
    deployment: config.deployment,
    messageCount: request.messages.length,
    catalogueIdCount: catalogueIds.length,
    catalogue: request.catalogue,
  });
  const response = await client.responses.create({
      model: config.deployment,
      instructions: instructions(request.catalogue, request.vehicleId),
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
  const parsedResponse = responseSchema.parse(JSON.parse(response.output_text));
  foundryDebug("model-response", {
    kind: parsedResponse.kind,
    serviceIds:
      parsedResponse.kind === "recommendation"
        ? parsedResponse.serviceIds
        : [],
    hasQuestion: Boolean(parsedResponse.question),
    hasExplanation: Boolean(parsedResponse.explanation),
    hasWorkshopNotes: Boolean(parsedResponse.workshopNotes),
    ...(process.env.FOUNDRY_DEBUG_RAW_RESPONSE === "true"
      ? { rawResponse: response.output_text }
      : {}),
  });
  return toDecision(parsedResponse, request.catalogue);
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
    try {
      return await requestFoundry(request);
    } catch (error) {
      const sdkError = error as {
        message?: string;
        status?: number;
        code?: string;
        request_id?: string;
      };
      foundryDebug("request-error", {
        message: sdkError.message ?? "Unknown Foundry error",
        status: sdkError.status,
        code: sdkError.code,
        requestId: sdkError.request_id,
      });
      throw error;
    }
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
