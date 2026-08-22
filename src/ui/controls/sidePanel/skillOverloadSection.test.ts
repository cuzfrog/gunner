import { buildSidePanel, getFake } from "../testSupport";

describe("SkillOverloadSection", () => {
  test("setSkillLevel updates the skill select and summary", () => {
    const { document, panel } = buildSidePanel("attacker");
    panel.setSkillLevel(3);
    expect(getFake(document, "attacker-skills").value).toBe("3");
    expect(getFake(document, "attacker-skill-summary").textContent).not.toBe("");
  });

  test("skillConditions reflects the current inputs", () => {
    const { document, panel } = buildSidePanel("attacker");
    getFake(document, "attacker-skills").value = "2";
    getFake(document, "attacker-overload").checked = true;
    expect(panel.sections.skill.skillConditions()).toEqual({ skillLevel: 2, overloaded: true });
  });

  test("setOverloadActive toggles the overload input and button", () => {
    const { document, panel } = buildSidePanel("attacker");
    panel.sections.skill.setOverloadActive(true);
    expect(getFake(document, "attacker-overload").checked).toBe(true);
    expect(getFake(document, "attacker-overload-button").getAttribute("aria-pressed")).toBe("true");
  });

  test("onOverloadButtonClick toggles the overload state", () => {
    const { document, panel } = buildSidePanel("attacker");
    getFake(document, "attacker-overload").checked = false;
    panel.sections.skill.onOverloadButtonClick();
    expect(getFake(document, "attacker-overload").checked).toBe(true);
  });

  test("renderSkillOptions creates skill buttons for all levels", () => {
    const { document, panel } = buildSidePanel("attacker");
    panel.sections.skill.renderSkillOptions();
    expect(getFake(document, "attacker-skills").children.length).toBe(6);
    expect(getFake(document, "attacker-skill-options").children.length).toBe(6);
  });

  test("setOverloadDisabled disables the overload when no propulsion is selected", () => {
    const { document, panel } = buildSidePanel("attacker");
    panel.sections.skill.setOverloadDisabled();
    expect(getFake(document, "attacker-overload").disabled).toBe(true);
    expect(getFake(document, "attacker-overload-button").disabled).toBe(true);
  });
});
