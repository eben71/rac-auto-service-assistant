import { describe, expect, it } from "vitest";
import {
  initialDraft,
  nextStep,
  previousStep,
  selectServiceId,
} from "./booking";
import { customerSchema, registrationSchema } from "./schemas";
import { answerDemoAssistant, startDemoAssistant } from "./assistant-demo";
import type { ServiceItem, Vehicle } from "./models";

const vehicle: Vehicle = {
  id: "synthetic",
  year: 2016,
  make: "Demo",
  model: "Car",
  fuel: "petrol-diesel",
  demonstration: true,
};
const items: ServiceItem[] = [
  {
    id: "essentials",
    name: "Essentials",
    description: "Demo",
    category: "main",
    demonstration: true,
  },
  {
    id: "ev",
    name: "EV",
    description: "Demo",
    category: "main",
    evOnly: true,
    demonstration: true,
  },
];

describe("booking state and validation", () => {
  it("moves back and forward without replacing the draft", () => {
    const draft = { ...initialDraft, vehicle, mainServiceId: "essentials" };
    expect(nextStep("services")).toBe("additional");
    expect(previousStep("additional")).toBe("services");
    expect(draft.mainServiceId).toBe("essentials");
  });
  it("rejects bad customer input and registration", () => {
    expect(
      customerSchema.safeParse({
        firstName: "",
        lastName: "Demo",
        email: "bad",
      }).success,
    ).toBe(false);
    expect(registrationSchema.safeParse("@@@")?.success).toBe(false);
  });
  it("rejects absent or ineligible service IDs", () => {
    expect(() => selectServiceId("invented", items, vehicle)).toThrow();
    expect(() => selectServiceId("ev", items, vehicle)).toThrow();
  });
  it("escalates a serious braking concern before recommending anything", () => {
    const state = startDemoAssistant("My brakes failed and I cannot stop");
    expect(state.kind).toBe("safety-escalation");
    expect(startDemoAssistant("My brakes aren't working").kind).toBe(
      "safety-escalation",
    );
  });
  it("does not infer brake parts from ordinary noise", () => {
    const state = startDemoAssistant("My brakes make a noise");
    expect(state.kind).toBe("clarification");
    expect(
      answerDemoAssistant(state, "I'm not sure", items, vehicle).kind,
    ).toBe("cannot-match");
  });
  it("prioritises steering loss reported during clarification", () => {
    const state = startDemoAssistant("I need an oil change");
    expect(
      answerDemoAssistant(state, "I lost steering control", items, vehicle)
        .kind,
    ).toBe("safety-escalation");
    expect(startDemoAssistant("I can't steer").kind).toBe("safety-escalation");
  });
  it("recommends only a present routine-service fixture after clarification", () => {
    const state = startDemoAssistant("I need an oil change");
    expect(
      answerDemoAssistant(state, "Routine servicing", items, vehicle),
    ).toMatchObject({
      kind: "recommendation",
      serviceId: "essentials",
    });
    expect(
      answerDemoAssistant(state, "Routine servicing", [], vehicle).kind,
    ).toBe("cannot-match");
  });
  it("does not invent a general inspection when the catalogue lacks one", () => {
    const state = startDemoAssistant("Rattle over bumps");
    expect(
      answerDemoAssistant(state, "I'm not sure", items, vehicle).kind,
    ).toBe("cannot-match");
  });
  it("only recommends an actual supplied inspection item", () => {
    const inspection: ServiceItem = {
      id: "general-inspection",
      name: "Inspection",
      description: "Demo",
      category: "main",
      demonstration: true,
    };
    expect(
      answerDemoAssistant(
        startDemoAssistant("Rattle"),
        "Mostly over bumps",
        [...items, inspection],
        vehicle,
      ),
    ).toMatchObject({
      kind: "recommendation",
      serviceId: "general-inspection",
    });
  });
});
