// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { BookingJourney } from "./booking-journey";
import { demoCatalogue, demoVehicle } from "@/server/autoquotes/mock";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("booking journey", () => {
  it("keeps selected services when navigating back and forward", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        const body =
          input === "/api/vehicles"
            ? { status: "found", vehicle: demoVehicle }
            : { items: demoCatalogue, demonstration: true };
        return { ok: true, json: async () => body };
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
    fireEvent.change(screen.getByLabelText("Vehicle registration"), {
      target: { value: "DEMO16" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Find vehicle" }));
    await waitFor(() =>
      expect(screen.getByText(/2016 Mitsubishi Pajero Sport/)).toBeTruthy(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Next: select service" }),
    );
    await waitFor(() =>
      expect(screen.getByTestId("service-essentials")).toBeTruthy(),
    );
    fireEvent.click(screen.getByTestId("service-essentials"));
    fireEvent.click(
      screen.getByRole("button", { name: "View braking safety demo" }),
    );
    expect(screen.getByText(/This may be unsafe/)).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Next: additional services" }),
    );
    fireEvent.click(screen.getByLabelText("Air con service"));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(
      screen.getByTestId("service-essentials").getAttribute("aria-pressed"),
    ).toBe("true");
    fireEvent.click(
      screen.getByRole("button", { name: "Next: additional services" }),
    );
    expect(
      (screen.getByLabelText("Air con service") as HTMLInputElement).checked,
    ).toBe(true);
  });
});
