// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { BookingJourney } from "./booking-journey";
import { demoCatalogue, demoVehicle } from "@/server/autoquotes/mock";
import { profileVehicles } from "@/domain/profile-fixtures";

beforeEach(() => {
  vi.stubGlobal("scrollTo", vi.fn());
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function mockRoutes() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      const body =
        input === "/api/demo-session"
          ? { profile: null }
          : input === "/api/vehicle-image"
            ? { image: null }
            : input === "/api/schedules"
              ? { schedules: [] }
              : input === "/api/vehicles" ||
                  input === "/api/vehicles/make-model"
                ? { status: "found", vehicle: demoVehicle }
                : { items: demoCatalogue, demonstration: true };
      return { ok: true, json: async () => body };
    }),
  );
}

async function reachServices(manual = true) {
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
    target: { value: "1GDU034" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Find car" }));
  await waitFor(() =>
    expect(screen.getByText("MITSUBISHI PAJERO SPORT")).toBeTruthy(),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Continue with this vehicle" }),
  );
  await waitFor(() =>
    expect(
      screen.getByRole("tab", { name: "Auto Services Assistant" }),
    ).toBeTruthy(),
  );
  if (manual) {
    fireEvent.click(
      screen.getByRole("tab", { name: "Choose a service myself" }),
    );
    await waitFor(() => expect(screen.getByTestId("service-1")).toBeTruthy());
  }
}

describe("booking journey", () => {
  it("lets a guest use the existing booking without signing in", async () => {
    mockRoutes();
    render(<BookingJourney />);
    expect(screen.getByText("Guest")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Continue as guest" }),
    ).toBeNull();
    fireEvent.change(screen.getByLabelText("First name"), {
      target: { value: "Demo" },
    });
    fireEvent.change(screen.getByLabelText("Last name"), {
      target: { value: "Guest" },
    });
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "guest@example.invalid" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Next: vehicle details" }),
    );
    expect(screen.getByLabelText("Registration")).toBeTruthy();
    expect(screen.queryByText("My vehicles")).toBeNull();
  });
  it("isolates active booking state across sign-out and developer switching", async () => {
    const exampleProfile = {
      id: "developer-1",
      displayName: "Configured Developer",
      email: "configured@rac.com.au",
      savedVehicles: [profileVehicles[0]],
    };
    const secondProfile = {
      id: "developer-3",
      displayName: "Second Developer",
      email: "second@rac.com.au",
      savedVehicles: [profileVehicles[2]],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string, init?: RequestInit) => {
        const body =
          input === "/api/demo-session"
            ? init?.method === "POST"
              ? {
                  profile: String(init.body).includes(secondProfile.email)
                    ? secondProfile
                    : exampleProfile,
                }
              : init?.method === "DELETE"
                ? { profile: null }
                : { profile: null }
            : input === "/api/my-vehicles"
              ? { profile: exampleProfile }
              : input === "/api/vehicle-image"
                ? { image: null }
                : { items: demoCatalogue, demonstration: true };
        return { ok: true, json: async () => body };
      }),
    );
    render(<BookingJourney />);
    fireEvent.click(screen.getAllByRole("button", { name: "Sign in" }).at(-1)!);
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "configured@rac.com.au" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "anything" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Sign in" }).at(-1)!);
    await waitFor(() =>
      expect(screen.getByText("Configured Developer")).toBeTruthy(),
    );
    const calls = vi.mocked(fetch).mock.calls;
    const loginCall = calls.find(
      (call) => call[0] === "/api/demo-session" && call[1]?.method === "POST",
    );
    expect(loginCall?.[1]?.body).toBe(
      JSON.stringify({ email: "configured@rac.com.au" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Select this vehicle" }),
    );
    expect(screen.getByText("TOYOTA RAV4")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Continue with this vehicle" }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("tab", { name: "Choose a service myself" }),
      ).toBeTruthy(),
    );
    fireEvent.click(
      screen.getByRole("tab", { name: "Choose a service myself" }),
    );
    await waitFor(() => expect(screen.getByTestId("service-1")).toBeTruthy());
    fireEvent.click(screen.getByText("Configured Developer"));
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(screen.getByText("Guest")).toBeTruthy());
    expect(screen.queryByTestId("service-1")).toBeNull();
    fireEvent.click(screen.getByText("Guest"));
    fireEvent.click(screen.getAllByRole("button", { name: "Sign in" })[0]);
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: secondProfile.email },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "anything" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Sign in" }).at(-1)!);
    await waitFor(() => expect(screen.getByText("Tesla Model 3")).toBeTruthy());
    expect(screen.queryByText("TOYOTA RAV4")).toBeNull();
  });
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
    fireEvent.click(screen.getByTestId("service-1"));
    expect(screen.getByTestId("service-1").getAttribute("aria-pressed")).toBe(
      "true",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Next: additional services" }),
    );
    fireEvent.click(screen.getByLabelText("Air con service"));
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    expect(screen.getByTestId("service-1").getAttribute("aria-pressed")).toBe(
      "true",
    );
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
    fireEvent.click(screen.getByTestId("service-1"));
    expect(screen.getByTestId("service-1").getAttribute("aria-pressed")).toBe(
      "false",
    );
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
    await reachServices(false);
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
      screen.getByRole("heading", { name: "Choose a service myself" }),
    ).toBeTruthy();
  });

  it("requires explicit confirmation for a catalogue-backed recommendation and carries notes to review", async () => {
    await reachServices(false);
    fireEvent.click(screen.getByRole("button", { name: "Routine service" }));
    fireEvent.click(screen.getByRole("button", { name: "Routine servicing" }));
    expect(
      screen.getByRole("button", { name: "Add to selection" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Add to selection" }));
    fireEvent.click(
      screen.getByRole("tab", { name: "Choose a service myself" }),
    );
    expect(screen.getByTestId("service-1").getAttribute("aria-pressed")).toBe(
      "true",
    );
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
    fireEvent.click(screen.getByTestId("service-1"));
    fireEvent.click(
      screen.getByRole("tab", { name: "Auto Services Assistant" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Braking safety" }));
    expect(screen.getByText("Safety first")).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Next: additional services" })
        .hasAttribute("disabled"),
    ).toBe(true);
    fireEvent.click(
      screen.getByRole("tab", { name: "Choose a service myself" }),
    );
    expect(
      screen
        .getByRole("button", { name: /Additional services/ })
        .hasAttribute("disabled"),
    ).toBe(true);
  });
  it("clears selected services when the active vehicle changes", async () => {
    await reachServices();
    fireEvent.click(screen.getByTestId("service-1"));
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    fireEvent.click(screen.getByRole("button", { name: "Change car" }));
    fireEvent.click(screen.getByRole("button", { name: "Find car" }));
    await waitFor(() =>
      expect(screen.getByText("MITSUBISHI PAJERO SPORT")).toBeTruthy(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Continue with this vehicle" }),
    );
    fireEvent.click(
      screen.getByRole("tab", { name: "Choose a service myself" }),
    );
    await waitFor(() =>
      expect(screen.getByTestId("service-1").getAttribute("aria-pressed")).toBe(
        "false",
      ),
    );
  });
  it("shows a mock schedule selector only for a vehicle with an MID", async () => {
    mockRoutes();
    const originalFetch = vi.mocked(fetch);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string, init?: RequestInit) => {
        if (input === "/api/schedules")
          return {
            ok: true,
            json: async () => ({
              schedules: [
                { id: "MITSG1600202", description: "MY -2016", sortOrder: 1 },
              ],
            }),
          };
        return originalFetch(input, init);
      }),
    );
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
      target: { value: "1GDU034" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Find car" }));
    await waitFor(() =>
      expect(screen.getByText("MITSUBISHI PAJERO SPORT")).toBeTruthy(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Continue with this vehicle" }),
    );
    fireEvent.click(
      screen.getByRole("tab", { name: "Choose a service myself" }),
    );
    await waitFor(() => expect(screen.getByTestId("service-9")).toBeTruthy());
    fireEvent.click(screen.getByTestId("service-9"));
    await waitFor(() =>
      expect(screen.getByRole("option", { name: "MY -2016" })).toBeTruthy(),
    );
    fireEvent.change(screen.getByLabelText(/Choose a schedule option/), {
      target: { value: "MITSG1600202" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Next: additional services" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Next: review selections" }),
    );
    expect(screen.getByText("MY -2016")).toBeTruthy();
  });

  it("clears a guest vehicle lookup when a developer signs in", async () => {
    const developer = {
      id: "developer-1",
      displayName: "Fresh Developer",
      email: "fresh@rac.com.au",
      savedVehicles: [profileVehicles[0]],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string, init?: RequestInit) => {
        if (input === "/api/demo-session")
          return {
            ok: true,
            json: async () => ({
              profile: init?.method === "POST" ? developer : null,
            }),
          };
        if (input === "/api/vehicles")
          return {
            ok: true,
            json: async () => ({ status: "found", vehicle: demoVehicle }),
          };
        if (input === "/api/vehicle-image")
          return { ok: true, json: async () => ({ image: null }) };
        return {
          ok: true,
          json: async () => ({ items: demoCatalogue, demonstration: true }),
        };
      }),
    );
    render(<BookingJourney />);
    fireEvent.change(screen.getByLabelText("First name"), {
      target: { value: "Guest" },
    });
    fireEvent.change(screen.getByLabelText("Last name"), {
      target: { value: "Driver" },
    });
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "guest@example.invalid" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Next: vehicle details" }),
    );
    fireEvent.change(screen.getByLabelText("Registration"), {
      target: { value: "1GDU034" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Find car" }));
    await waitFor(() =>
      expect(screen.getByText("MITSUBISHI PAJERO SPORT")).toBeTruthy(),
    );
    fireEvent.click(screen.getByText("Guest"));
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: developer.email },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "anything" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Sign in" }).at(-1)!);
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "My vehicles" })).toBeTruthy(),
    );
    expect(screen.queryByLabelText("Registration")).toBeNull();
    expect(screen.queryByText("MITSUBISHI PAJERO SPORT")).toBeNull();
    expect(screen.getByText("Toyota RAV4")).toBeTruthy();
  });

  it("requires removal confirmation, supports cancellation, and clears temporary feedback", async () => {
    const developer = {
      id: "developer-1",
      displayName: "Garage Developer",
      email: "garage@rac.com.au",
      savedVehicles: [profileVehicles[0]],
    };
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      if (input === "/api/demo-session")
        return { ok: true, json: async () => ({ profile: developer }) };
      if (input === "/api/my-vehicles" && init?.method === "POST")
        return {
          ok: true,
          json: async () => ({ profile: { ...developer, savedVehicles: [] } }),
        };
      return { ok: true, json: async () => ({ image: null }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<BookingJourney />);
    await waitFor(() => expect(screen.getByText("Toyota RAV4")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(
      screen.getByRole("dialog", { name: "Remove vehicle?" }),
    ).toBeTruthy();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Cancel" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(
      screen.queryByRole("dialog", { name: "Remove vehicle?" }),
    ).toBeNull();
    expect(
      fetchMock.mock.calls.filter((call) => call[0] === "/api/my-vehicles"),
    ).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "Remove vehicle" }));
    await act(async () => Promise.resolve());
    expect(screen.getByText("Vehicle removed from My vehicles.")).toBeTruthy();
    expect(screen.getByText("No saved vehicles yet.")).toBeTruthy();
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.queryByText("Vehicle removed from My vehicles.")).toBeNull();
    vi.useRealTimers();
  });

  it("validates and persists customer-supplied vehicle details", async () => {
    const developer = {
      id: "developer-1",
      displayName: "Details Developer",
      email: "details@rac.com.au",
      savedVehicles: [profileVehicles[0]],
    };
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      if (input === "/api/demo-session")
        return { ok: true, json: async () => ({ profile: developer }) };
      if (input === "/api/my-vehicles" && init?.method === "POST")
        return { ok: true, json: async () => ({ profile: developer }) };
      if (input === "/api/vehicle-image")
        return { ok: true, json: async () => ({ image: null }) };
      return {
        ok: true,
        json: async () => ({ items: demoCatalogue, demonstration: true }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<BookingJourney />);
    await waitFor(() => expect(screen.getByText("Toyota RAV4")).toBeTruthy());
    fireEvent.click(
      screen.getByRole("button", { name: "Select this vehicle" }),
    );
    fireEvent.change(screen.getByLabelText("Odometer in km (optional)"), {
      target: { value: "-1" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Update saved details" }),
    );
    expect(screen.getByText("Odometer cannot be negative")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Vehicle year"), {
      target: { value: "2021" },
    });
    fireEvent.change(screen.getByLabelText("Colour (optional)"), {
      target: { value: "Blue" },
    });
    fireEvent.change(screen.getByLabelText("Odometer in km (optional)"), {
      target: { value: "85000" },
    });
    fireEvent.change(screen.getByLabelText("Nickname (optional)"), {
      target: { value: "Family car" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Update saved details" }),
    );
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some((call) => {
          if (call[0] !== "/api/my-vehicles") return false;
          const body = JSON.parse(String(call[1]?.body));
          return (
            body.operation === "add" &&
            body.vehicle.customerDetails.year === 2021 &&
            body.vehicle.customerDetails.colour === "Blue" &&
            body.vehicle.customerDetails.odometerKm === 85000 &&
            body.vehicle.customerDetails.nickname === "Family car"
          );
        }),
      ).toBe(true),
    );
  });

  it("defaults to the assistant and preserves conversation and manual selections across modes", async () => {
    await reachServices(false);
    expect(
      screen
        .getByRole("tab", { name: "Auto Services Assistant" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    expect(screen.queryByTestId("service-1")).toBeNull();
    fireEvent.change(screen.getByLabelText("What would you like help with?"), {
      target: { value: "A rattle over bumps" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Help me find a service" }),
    );
    fireEvent.click(
      screen.getByRole("tab", { name: "Choose a service myself" }),
    );
    fireEvent.click(screen.getByTestId("service-1"));
    fireEvent.click(
      screen.getByRole("tab", { name: "Auto Services Assistant" }),
    );
    expect(screen.getByText("Choose an answer")).toBeTruthy();
    expect(screen.queryByTestId("service-1")).toBeNull();
    fireEvent.click(
      screen.getByRole("tab", { name: "Choose a service myself" }),
    );
    expect(screen.getByTestId("service-1").getAttribute("aria-pressed")).toBe(
      "true",
    );
  });
});
