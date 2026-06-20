import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SuperAdminDashboard } from "./dashboard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe("SuperAdminDashboard", () => {
  it("affiche le cockpit de la plateforme", () => {
    render(<SuperAdminDashboard demoMode />);

    expect(
      screen.getByRole("heading", { name: "Bonjour, Super Admin" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Teranga Market")).toBeInTheDocument();
    expect(screen.getByText("Données de démonstration")).toBeInTheDocument();
  });
});
