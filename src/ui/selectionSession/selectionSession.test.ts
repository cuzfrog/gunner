import { SelectionSessionImpl, type StoredSelection } from "./selectionSession";

describe("SelectionSessionImpl", () => {
  test("recall returns undefined for unknown key", () => {
    const session = new SelectionSessionImpl();
    expect(session.recall("turret:pulseLaser:small")).toBeUndefined();
  });

  test("remember stores and recall retrieves by key", () => {
    const session = new SelectionSessionImpl();
    const selection: StoredSelection = { moduleId: "12345" as never, ammoId: "67890" as never };
    session.remember("turret:pulseLaser:small", selection);
    expect(session.recall("turret:pulseLaser:small")).toEqual(selection);
  });

  test("remember overwrites previous value for same key", () => {
    const session = new SelectionSessionImpl();
    const first: StoredSelection = { moduleId: "111" as never, ammoId: "222" as never };
    const second: StoredSelection = { moduleId: "333" as never, ammoId: "444" as never };
    session.remember("launcher:rocket", first);
    session.remember("launcher:rocket", second);
    expect(session.recall("launcher:rocket")).toEqual(second);
  });

  test("keys are independent", () => {
    const session = new SelectionSessionImpl();
    const turretSel: StoredSelection = { moduleId: "t1" as never, ammoId: "a1" as never };
    const launcherSel: StoredSelection = { moduleId: "l1" as never, ammoId: "m1" as never };
    session.remember("turret:pulseLaser:small", turretSel);
    session.remember("launcher:rocket", launcherSel);
    expect(session.recall("turret:pulseLaser:small")).toEqual(turretSel);
    expect(session.recall("launcher:rocket")).toEqual(launcherSel);
  });

  test("clear removes all entries", () => {
    const session = new SelectionSessionImpl();
    session.remember("turret:pulseLaser:small", { moduleId: "t1" as never, ammoId: "a1" as never });
    session.remember("launcher:rocket", { moduleId: "l1" as never, ammoId: "m1" as never });
    session.clear();
    expect(session.recall("turret:pulseLaser:small")).toBeUndefined();
    expect(session.recall("launcher:rocket")).toBeUndefined();
  });

  test("ammoId is optional", () => {
    const session = new SelectionSessionImpl();
    const selection: StoredSelection = { moduleId: "12345" as never };
    session.remember("propulsion:afterburner", selection);
    expect(session.recall("propulsion:afterburner")).toEqual({ moduleId: "12345" as never });
  });
});
