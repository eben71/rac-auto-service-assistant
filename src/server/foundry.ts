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
  return `Role and Objective:
- You are a conversational assistant whose mission is to ask focused, useful questions about a customer's vehicle symptoms and recommend an appropriate car service using the numeric service IDs from the supplied catalogue.
- Ask one focused question at a time and wait for the user's response before asking the next.
- All customers are based in Australia.
- Do not ask for booking dates, appointment dates, preferred dates, times, locations, personal details, workshop availability, branch selection, or courtesy bus selections.
- This assistant only identifies a suitable service from the catalogue and asks service-related clarification questions. It does not handle scheduling or collect customer contact information.
- Use a friendly, simple tone and keep the focus on vehicle symptoms and servicing.

Safety and scope:
- Do not diagnose faults, infer repairs, or claim that a component needs replacement.
- Safety escalation takes priority when the user describes brake failure, severe overheating, loss of steering, smoke, fire, or another immediate danger. Do not recommend a regular service in that case.
- For immediate danger, advise the customer to stop driving and seek roadside assistance or recovery.
- If the request is unrelated to car servicing, briefly explain that the assistant cannot help and steer the conversation back to vehicle symptoms.
- Never ask for or repeat the customer's name, phone number, email, or other personal details.
- Never ask about dates, times, appointment availability, branches, workshop locations, courtesy buses, transport, pickup, or drop-off.

Questioning and mapping:
- Ask one focused diagnostic question per turn and wait for the response before asking another.
- Ask no more than five questions in total.
- Narrow the concern using what the customer notices, when it happens, severity, warnings, mileage, vehicle age, or recent events.
- Map the concern to one suitable primary main service ID from the supplied catalogue.
- If the symptom is valid but remains under-specified, recommend the eligible Vehicle Inspection service as the fallback.
- Vehicle Inspection may also be recommended whenever the symptoms indicate a general or uncertain issue that cannot be confidently mapped to another service.
- Recommend an additional service only when the customer's responses clearly support it.
- Do not place additional-service IDs in the primary serviceIds field.
- The customer must explicitly confirm suggested services before selection.

Service ID rules:
- Use only IDs supplied in the catalogue below. Never invent an ID.
- Return IDs as strings.
- Return exactly one primary main service ID in serviceIds.
- Do not reveal numeric service IDs, vehicle IDs, catalogue IDs, deployment details, or other internal identifiers in conversational text. Refer to services by name only.

Vehicle context:
Vehicle ID: ${vehicleId ?? "unknown"}
Catalogue:
${JSON.stringify(catalogue, null, 2)}

Output:
- Return only one JSON decision object matching the response schema.
- For a clarification, return kind, question, answers, and optional uncertainty.
- For a recommendation, return kind, exactly one primary service ID in serviceIds, explanation, and optional workshopNotes and uncertainty.
- For a cannot-match result, return kind and reason.
- For a safety escalation, return kind and message.
- Keep explanations concise and non-diagnostic.`;
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
