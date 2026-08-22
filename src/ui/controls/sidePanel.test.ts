import { buildSidePanel, getFake } from "./testSupport";

describe("SidePanel", () => {
  test("capture returns the current side panel inputs", () => {
    const { document, panel } = buildSidePanel("attacker");
    getFake(document, "attacker-speed").value = "450";
    getFake(document, "attacker-mass").value = "1200000";
    getFake(document, "attacker-inertia").value = "2.5";
    getFake(document, "attacker-range").value = "8000";
    getFake(document, "attacker-mode").value = "keepAtRange";
    getFake(document, "attacker-skills").value = "3";
    getFake(document, "attacker-overload").checked = true;
    const state = panel.capture();
    expect(state.speed).toBe(450);
    expect(state.mass).toBe(1_200_000);
    expect(state.inertia).toBe(2.5);
    expect(state.range).toBe(8000);
    expect(state.mode).toBe("keepAtRange");
    expect(state.skillLevel).toBe(3);
    expect(state.overload).toBe(true);
    expect(state.sig).toBeUndefined();
  });

  test("capture for target side includes target signature", () => {
    const { document, panel } = buildSidePanel("target");
    getFake(document, "target-mode").value = "orbit";
    getFake(document, "target-sig").value = "120";
    const state = panel.capture();
    expect(state.sig).toBe(120);
  });
});
