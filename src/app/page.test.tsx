import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home", () => {
  it("présente la proposition de valeur AFRICRM Shop", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        name: /vendez mieux/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Encaissement éclair")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Mon entreprise" }),
    ).toHaveAttribute("href", "/connexion");
  });
});
