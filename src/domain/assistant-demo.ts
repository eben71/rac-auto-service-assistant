import type { AssistantState, ServiceItem, Vehicle } from "./models";
import { selectServiceId } from "./booking";

const brakingRisk =
  /brak(?:e|es|ing).{0,60}(?:fail|not work|don'?t work|aren'?t working|no stop|pedal.*floor|lost|unsafe)|can'?t stop|cannot stop|unable to stop|can'?t brake|cannot brake|pedal.*floor/i;
export function startDemoAssistant(input: string): AssistantState {
  const text = input.trim();
  if (!text) return { kind: "idle" };
  if (brakingRisk.test(text))
    return {
      kind: "safety-escalation",
      messages: [
        { role: "user", text },
        {
          role: "assistant",
          text: "This may be unsafe. Do not continue driving. Arrange appropriate roadside assistance or recovery. This demo cannot assess the fault.",
        },
      ],
    };
  return {
    kind: "clarification",
    messages: [
      { role: "user", text },
      {
        role: "assistant",
        text: "When do you notice it most? Your answer helps us find a suitable service category; this is not a diagnosis.",
      },
    ],
  };
}
export function answerDemoAssistant(
  state: AssistantState,
  answer: string,
  items: ServiceItem[],
  vehicle: Vehicle | null,
): AssistantState {
  if (state.kind !== "clarification") return state;
  const messages = [...state.messages, { role: "user" as const, text: answer }];
  const inspection = items.find(
    (item) => item.id === "general-inspection" && item.category === "main",
  );
  if (inspection) {
    try {
      selectServiceId(inspection.id, items, vehicle);
      return {
        kind: "recommendation",
        serviceId: inspection.id,
        messages: [
          ...messages,
          {
            role: "assistant",
            text: "A general inspection is available in this demonstration catalogue. A workshop can assess the concern; no fault is diagnosed here.",
          },
        ],
      };
    } catch {
      /* An ineligible item must not be recommended. */
    }
  }
  return {
    kind: "cannot-match",
    messages: [
      ...messages,
      {
        role: "assistant",
        text: "We cannot match this concern to a verified bookable inspection item in this demo. Please contact the workshop for help choosing a service.",
      },
    ],
  };
}
