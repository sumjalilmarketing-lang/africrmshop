import { describe, expect, it } from "vitest";
import { buildCsvContent } from "./csv-export";

describe("buildCsvContent", () => {
  it("génère un CSV compatible tableur avec séparateur point-virgule", () => {
    const csv = buildCsvContent([
      ["Ticket", "Client", "Note"],
      ["POS-001", "Awa; Fall", 'Retour "client" validé'],
      ["POS-002", "Moussa", "ligne 1\nligne 2"],
    ]);

    expect(csv).toBe(
      [
        "Ticket;Client;Note",
        'POS-001;"Awa; Fall";"Retour ""client"" validé"',
        "POS-002;Moussa;ligne 1 ligne 2",
      ].join("\n"),
    );
  });
});
