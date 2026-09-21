import { z } from "zod";
import type { AssistantState, BookingDraft, BookingStep } from "./models";
import { vehicleSchema } from "./schemas";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().max(4_000),
});
const messagesSchema = z.array(messageSchema).max(30);
const assistantStateSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("idle") }),
  z.object({
    kind: z.literal("clarification"),
    messages: messagesSchema,
    intent: z.enum(["routine-service", "symptom"]).optional(),
    answers: z.array(z.string().max(200)).max(10).optional(),
  }),
  z.object({
    kind: z.literal("recommendation"),
    messages: messagesSchema,
    serviceId: z.string().max(100),
    explanation: z.string().max(4_000).optional(),
    workshopNotes: z.string().max(4_000).optional(),
  }),
  z.object({ kind: z.literal("cannot-match"), messages: messagesSchema }),
  z.object({ kind: z.literal("safety-escalation"), messages: messagesSchema }),
]);
const bookingDraftSchema = z.object({
  customer: z.object({
    firstName: z.string().max(80),
    lastName: z.string().max(80),
    email: z.string().max(254),
  }),
  vehicle: vehicleSchema.nullable(),
  mainServiceId: z.string().nullable(),
  additionalServiceIds: z.array(z.string()).max(30),
  workshopNotes: z.array(z.string().max(4_000)).max(20),
  serviceScheduleId: z.string().nullable().optional(),
});
const persistedSessionSchema = z.object({
  version: z.literal(1),
  step: z.enum(["begin", "vehicle", "services", "additional", "review"]),
  draft: bookingDraftSchema,
  assistant: assistantStateSchema,
  serviceMode: z.enum(["assistant", "manual"]),
});

export interface PersistedBookingSession {
  version: 1;
  step: BookingStep;
  draft: BookingDraft;
  assistant: AssistantState;
  serviceMode: "assistant" | "manual";
}

export function parseBookingSession(
  value: string,
): PersistedBookingSession | null {
  try {
    return persistedSessionSchema.parse(JSON.parse(value));
  } catch {
    return null;
  }
}
