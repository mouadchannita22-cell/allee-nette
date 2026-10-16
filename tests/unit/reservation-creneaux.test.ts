import { describe, expect, it } from "vitest";
import { anneeParis, formaterDateHeureParis, jourParis, versIso } from "@/lib/date-paris";
import { creneauAutorise, creneauxDisponibles, libelleCreneau, lireCreneau } from "@/lib/reservation/creneaux";

/** Vendredi 16 octobre 2026, 15 h à Paris. */
const vendredi = new Date("2026-10-16T13:00:00Z");

describe("heure de Paris", () => {
  it("le jour change à minuit à Paris, pas à minuit UTC", () => {
    expect(versIso(jourParis(new Date("2026-10-16T21:30:00Z")))).toBe("2026-10-16");
    expect(versIso(jourParis(new Date("2026-10-16T22:30:00Z")))).toBe("2026-10-17");
    // Heure d'hiver : UTC+1.
    expect(versIso(jourParis(new Date("2026-12-31T22:59:00Z")))).toBe("2026-12-31");
    expect(versIso(jourParis(new Date("2026-12-31T23:01:00Z")))).toBe("2027-01-01");
  });

  it("année à Paris", () => {
    expect(anneeParis(new Date("2026-12-31T23:30:00Z"))).toBe(2027);
    expect(anneeParis(new Date("2026-12-31T22:30:00Z"))).toBe(2026);
  });

  it("date et heure lisibles", () => {
    expect(formaterDateHeureParis(vendredi)).toBe("vendredi 16 octobre 2026 à 15 h 00");
    expect(formaterDateHeureParis(new Date("2027-01-05T08:07:00Z"))).toBe("mardi 5 janvier 2027 à 9 h 07");
  });
});

describe("créneaux disponibles (partie 9.1, étape 4)", () => {
  it("mercredi après-midi, samedi matin et après-midi, du lendemain à 4 semaines", () => {
    const liste = creneauxDisponibles(vendredi);
    expect(liste.map((c) => c.id)).toEqual([
      "2026-10-17_matin",
      "2026-10-17_apres-midi",
      "2026-10-21_apres-midi",
      "2026-10-24_matin",
      "2026-10-24_apres-midi",
      "2026-10-28_apres-midi",
      "2026-10-31_matin",
      "2026-10-31_apres-midi",
      "2026-11-04_apres-midi",
      "2026-11-07_matin",
      "2026-11-07_apres-midi",
      "2026-11-11_apres-midi",
    ]);
    expect(liste[0]!.libelle).toBe("Samedi 17 octobre, matin");
    expect(liste[2]!.libelle).toBe("Mercredi 21 octobre, après-midi");
  });

  it("jamais le jour même : vendredi 23 h 30 à Paris, le premier créneau est le mercredi", () => {
    const liste = creneauxDisponibles(new Date("2026-10-16T21:30:00Z"));
    expect(liste[0]!.id).toBe("2026-10-17_matin");
    const apresMinuit = creneauxDisponibles(new Date("2026-10-16T22:30:00Z"));
    expect(apresMinuit[0]!.id).toBe("2026-10-21_apres-midi");
  });

  it("le serveur tolère un jour d'écart, de chaque côté", () => {
    const samedi = new Date("2026-10-17T10:00:00Z");
    expect(creneauAutorise("2026-10-17_apres-midi", samedi)).toBe(false);
    expect(creneauAutorise("2026-10-17_apres-midi", samedi, 1)).toBe(true);
    expect(creneauAutorise("2026-10-16_apres-midi", samedi, 1)).toBe(false);

    const mardi = new Date("2026-10-13T10:00:00Z");
    expect(creneauAutorise("2026-11-11_apres-midi", mardi)).toBe(false);
    expect(creneauAutorise("2026-11-11_apres-midi", mardi, 1)).toBe(true);
  });

  it("refuse un jour ou un moment non proposé, une date impossible, un format inconnu", () => {
    expect(creneauAutorise("2026-10-22_matin", vendredi)).toBe(false);
    expect(creneauAutorise("2026-10-21_matin", vendredi)).toBe(false);
    expect(lireCreneau("2026-02-30_matin")).toBeNull();
    expect(lireCreneau("2026-10-21_soir")).toBeNull();
    expect(lireCreneau("21/10/2026")).toBeNull();
    expect(libelleCreneau("n'importe quoi")).toBe("");
  });
});
