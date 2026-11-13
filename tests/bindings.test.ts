import { describe, expect, test } from "vitest";
import { normalizeConfig } from "../src/config";
import { createTranslator } from "../src/localize";
import { buildBindings } from "../src/model/bindings";
import { buildModel } from "../src/model/build";
import { makeConfig, makeHass } from "./fixtures/home";

(globalThis as { process?: { env: Record<string, string> } }).process!.env.TZ =
  "Europe/Copenhagen";

const NOW = new Date("2026-11-13T21:00:00+01:00");

function homeBindings() {
  const config = makeConfig();
  const model = buildModel(makeHass(), config, NOW);
  return buildBindings(model, config, createTranslator("da"));
}

describe("buildBindings", () => {
  test("binds the vitals, room rows, system card, and chapter summaries", () => {
    const b = homeBindings();

    expect(b.roomsMeta).toBe(
      "<b>7 rum</b> · 0 åbne · <b>0</b> lys tændt",
    );
    expect(b.indoor).toBe("22,5");
    expect(b.indoorSub).toBe("gennemsnit · inde");
    expect(b.price).toBe("1,75");
    expect(b.priceSub).toBe("kr/kWh · nu");
    expect(b.battery).toBe("27");
    expect(b.batterySub).toBe("ladning");
    expect(b.solarNow).toBe("0");
    expect(b.solarSub).toBe("15,3 kWh i dag");
    expect(b.alertPill).toBe("2");

    expect(b.r_stue_temp).toBe("22,9");
    expect(b.r_kokken_temp).toBe("23,9");
    expect(b.r_kontor_temp).toBe("24,4");
    expect(b.r_kontor_air).toBe("luft 620 ppm");
    expect(b.r_kokken_air).toBe("luft –");
    expect(b.r_kokken_lights).toBe("0 / 10 lys");
    expect(b.r_bryggers_lights).toBe("0 / 3 lys");
    expect(b.r_entre_lights).toBe("0 / 2 lys");
    expect(b.r_stue_open).toBe("lukket");
    expect(b.r_kokken_open).toBe("lukket");
    expect(b.r_skur_open).toBe("");

    expect(b.s_ventilation_temp).toBe("23,2");
    expect(b.s_ventilation_sub).toBe("blæsertrin 2 · 38 %");
  });

  test("renders every chapter summary as legacy-style HTML", () => {
    const b = homeBindings();

    expect(b.ch_energi_sum).toBe(
      "<b>1,75 kr/kWh</b> · huset bruger 665 W",
    );
    expect(b.ch_sol_sum).toBe("<b>27 % batteri</b> · 15,3 kWh i dag");
    expect(b.ch_vand_sum).toBe(
      "<b>12,2 L i dag</b> · BWT OK · salt 41 %",
    );
    expect(b.ch_sikkerhed_sum).toBe(
      "<b>Alt lukket</b> · ingen lækage",
    );
    expect(b.ch_ventilation_sum).toBe(
      "<b>23,2°</b> · blæsertrin 2 · skift filter",
    );
    expect(b.ch_teknik_sum).toBe(
      "<b>0,3 ms</b> router · 8,1 ms google",
    );
    expect(b.ch_oekonomi_sum).toBe("<b>97,15</b> · +0,22 i dag");
    expect(b.ch_lys_sum).toBe("<b>0 af 15</b> lys tændt");
    expect(b.ch_varme_sum).toBe("<b>23,2°</b> · 22,5° setpunkt");
    expect(b.ch_alarmer_sum).toBe(
      "<b>2 ting</b> · Nilan vil have nyt filter",
    );
    expect(b.ch_alarmer_num).toBe("2");
  });

  test("returns stable keys for an empty home", () => {
    const hass = makeHass({
      areas: {},
      devices: {},
      entities: {},
      states: {},
    });
    const config = normalizeConfig({
      type: "custom:arcus-card",
      language: "en",
    });
    const model = buildModel(hass, config, NOW);
    const b = buildBindings(model, config, createTranslator("en"));

    expect(b.roomsMeta).toBe("<b>0 rooms</b> · 0 open · <b>0</b> lights on");
    expect(b.indoor).toBe("–");
    expect(b.indoorSub).toBe("average · indoor");
    expect(b.price).toBe("–");
    expect(b.priceSub).toBe("DKK/kWh · now");
    expect(b.battery).toBe("–");
    expect(b.batterySub).toBe("–");
    expect(b.solarNow).toBe("–");
    expect(b.solarSub).toBe("today");
    expect(b.alertPill).toBe("0");
    expect(b.r_stue_temp).toBeUndefined();
    expect(b.s_ventilation_temp).toBeUndefined();

    for (const key of [
      "energi",
      "sol",
      "vand",
      "sikkerhed",
      "ventilation",
      "teknik",
      "oekonomi",
      "lys",
      "varme",
      "alarmer",
    ]) {
      expect(b[`ch_${key}_sum`]).toBeTypeOf("string");
      expect(b[`ch_${key}_sum`].length).toBeGreaterThan(0);
    }
    expect(b.ch_alarmer_sum).toBe("All is calm");
  });
});
