// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { BookingJourney } from "./booking-journey";
import { demoCatalogue, demoVehicle } from "@/server/autoquotes/mock";

beforeEach(() => vi.stubGlobal("scrollTo", vi.fn()));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function mockRoutes() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      const body =
        input === "/api/vehicles" || input === "/api/vehicles/make-model"
          ? { status: "found", vehicle: demoVehicle }
          : { items: demoCatalogue, demonstration: true };
      return { ok: true, json: async () => body };
    }),
  );
}

async function reachServices() {
  mockRoutes();
  render(<BookingJourney />);
  fireEvent.change(screen.getByLabelText("First name"), {
    target: { value: "Demo" },
  });
  fireEvent.change(screen.getByLabelText("Last name"), {
    target: { value: "Customer" },
  });
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "demo@example.invalid" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Next: vehicle details" }),
  );
  fireEvent.change(screen.getByLabelText("Registration"), {
    target: { value: "DEMO16" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Find car" }));
  await waitFor(() =>
    expect(screen.getByText("MITSUBISHI PAJERO SPORT")).toBeTruthy(),
  );
  fireEvent.click(screen.getByRole("button", { name: "Next: select service" }));
  await waitFor(() =>
    expect(screen.getByTestId("service-essentials")).toBeTruthy(),
  );
}

describe("booking journey", () => {
  it("validates customer fields and retains them after Back", () => {
    mockRoutes();
    render(<BookingJourney />);
    fireEvent.click(
      screen.getByRole("button", { name: "Next: vehicle details" }),
    );
    expect(screen.getByText("Enter your first name")).toBeTruthy();
    expect(screen.getByText("Enter your last name")).toBeTruthy();
    expect(screen.getByText("Enter a valid email address")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("First name"), {
      target: { value: "Demo" },
    });
    fireEvent.change(screen.getByLabelText("Last name"), {
      target: { value: "Customer" },
    });
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "demo@example.invalid" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Next: vehicle details" }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    expect(
      (screen.getByLabelText("First name") as HTMLInputElement).value,
    ).toBe("Demo");
  });

  it("keeps main and additional selections across navigation and permits deselection", async () => {
    await reachServices();
    fireEvent.click(screen.getByTestId("service-essentials"));
    expect(
      screen.getByTestId("service-essentials").getAttribute("aria-pressed"),
    ).toBe("true");
    fireEvent.click(
      screen.getByRole("button", { name: "Next: additional services" }),
    );
    fireEvent.click(screen.getByLabelText("Air con service"));
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    expect(
      screen.getByTestId("service-essentials").getAttribute("aria-pressed"),
    ).toBe("true");
    fireEvent.click(
      screen.getByRole("button", { name: "Next: additional services" }),
    );
    expect(
      (screen.getByLabelText("Air con service") as HTMLInputElement).checked,
    ).toBe(true);
    fireEvent.click(screen.getByLabelText("Air con service"));
    expect(
      (screen.getByLabelText("Air con service") as HTMLInputElement).checked,
    ).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    fireEvent.click(screen.getByTestId("service-essentials"));
    expect(
      screen.getByTestId("service-essentials").getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("supports make and model selection and changing the car", async () => {
    mockRoutes();
    render(<BookingJourney />);
    fireEvent.change(screen.getByLabelText("First name"), {
      target: { value: "Demo" },
    });
    fireEvent.change(screen.getByLabelText("Last name"), {
      target: { value: "Customer" },
    });
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "demo@example.invalid" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Next: vehicle details" }),
    );
    fireEvent.click(screen.getByRole("tab", { name: "By make & model" }));
    fireEvent.change(screen.getByLabelText("Make"), {
      target: { value: "Mitsubishi" },
    });
    fireEvent.change(screen.getByLabelText("Model"), {
      target: { value: "Pajero Sport" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Find car" }));
    await waitFor(() =>
      expect(screen.getByText("MITSUBISHI PAJERO SPORT")).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Change car" }));
    expect(screen.getByLabelText("Make")).toBeTruthy();
  });

  it("opens and focuses inline help from the additional-services link", async () => {
    await reachServices();
    fireEvent.click(
      screen.getByRole("button", { name: /Additional services/ }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Looking for something not listed/ }),
    );
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByLabelText("What would you like help with?"),
      ),
    );
  });

  it("opens, closes and resumes clarification, then shows a safe cannot-match state", async () => {
    await reachServices();
    fireEvent.change(screen.getByLabelText("What would you like help with?"), {
      target: { value: "A rattle over bumps" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Help me find a service" }),
    );
    expect(
      screen.getByText(
        "When do you notice it most? Your answer helps us find a suitable service category; this is not a diagnosis.",
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close conversation" }));
    expect(screen.queryByText("Choose an answer")).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Resume conversation" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "I'm not sure" }));
    expect(screen.getByText("We couldn't match that safely")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Return to manual service selection",
      }),
    );
    expect(
      screen.getByRole("heading", { name: "Select a service manually" }),
    ).toBeTruthy();
  });

  it("requires explicit confirmation for a catalogue-backed recommendation and carries notes to review", async () => {
    await reachServices();
    fireEvent.click(screen.getByRole("button", { name: "Routine service" }));
    fireEvent.click(screen.getByRole("button", { name: "Routine servicing" }));
    expect(
      screen.getByRole("button", { name: "Add to selection" }),
    ).toBeTruthy();
    expect(
      screen.getByTestId("service-essentials").getAttribute("aria-pressed"),
    ).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "Add to selection" }));
    expect(
      screen.getByTestId("service-essentials").getAttribute("aria-pressed"),
    ).toBe("true");
    fireEvent.click(
      screen.getByRole("button", { name: "Next: additional services" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Next: review selections" }),
    );
    expect(
      screen.getByText(/Customer asked about routine servicing/),
    ).toBeTruthy();
  });

  it("pauses progression for serious braking symptoms", async () => {
    await reachServices();
    fireEvent.click(screen.getByTestId("service-essentials"));
    fireEvent.click(screen.getByRole("button", { name: "Braking safety" }));
    expect(screen.getByText("Safety first")).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Next: additional services" })
        .hasAttribute("disabled"),
    ).toBe(true);
    expect(
      screen
        .getByRole("button", { name: /Additional services/ })
        .hasAttribute("disabled"),
    ).toBe(true);
  });
});
