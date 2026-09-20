import type {
  AssistantMessage,
  AssistantState,
  ServiceItem,
  Vehicle,
} from "./models";
import { selectServiceId } from "./booking";

const safetyRisk =
  /brak(?:e|es|ing).{0,60}(?:fail|not work|don'?t work|aren'?t working|no stop|pedal.*floor|lost|unsafe)|can'?t stop|cannot stop|unable to stop|can'?t brake|cannot brake|pedal.*floor|steer(?:ing)?.{0,40}(?:fail|not work|doesn'?t work|lost|lock|cannot|can'?t)|lost.{0,20}steer|can'?t steer|cannot steer|unable to steer/i;
const routineRequest =
  /\b(oil (?:and filter )?change|routine service|regular service|scheduled service|car service)\b/i;

function safetyEscalation(messages: AssistantMessage[]): AssistantState {
  return {
    kind: "safety-escalation",
    messages: [
      ...messages,
      {
        role: "assistant",
        text: "This may be unsafe. Do not continue driving. Arrange appropriate roadside assistance or recovery. This demo cannot assess the fault.",
      },
    ],
  };
}
export function startDemoAssistant(input: string): AssistantState {
  const text = input.trim();
  if (!text) return { kind: "idle" };
  if (safetyRisk.test(text)) return safetyEscalation([{ role: "user", text }]);
  if (routineRequest.test(text))
    return {
      kind: "clarification",
      intent: "routine-service",
      messages: [
        { role: "user", text },
        {
          role: "assistant",
          text: "Is this for routine servicing, or are you asking about a specific problem? This helps us navigate the demonstration catalogue; it is not a diagnosis.",
        },
      ],
    };
  return {
    kind: "clarification",
    intent: "symptom",
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
  const response = answer.trim();
  if (!response) return state;
  const messages = [
    ...state.messages,
    { role: "user" as const, text: response },
  ];
  if (safetyRisk.test(response)) return safetyEscalation(messages);
  if (
    state.intent === "routine-service" &&
    /routine|scheduled|oil change/i.test(response)
  ) {
    const service = items.find(
      (item) => item.id === "essentials" && item.category === "main",
    );
    if (service) {
      try {
        selectServiceId(service.id, items, vehicle);
        return {
          kind: "recommendation",
          serviceId: service.id,
          explanation:
            "You asked about routine servicing. This item is listed as a routine option in the demonstration catalogue. Review it before adding; the workshop must confirm actual suitability and inclusions.",
          workshopNotes:
            "Customer asked about routine servicing. Confirm the appropriate package and actual inclusions.",
          messages: [
            ...messages,
            {
              role: "assistant",
              text: "I found a demonstration routine-service option for you to review.",
            },
          ],
        };
      } catch {
        /* Only catalogue-backed, eligible IDs may be recommended. */
      }
    }
  }
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
