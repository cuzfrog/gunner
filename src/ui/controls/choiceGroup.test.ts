import { ChoiceGroup } from "./choiceGroup";

interface FakeButton {
  readonly value: string;
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  classList: { toggle(name: string, force: boolean): void };
  addEventListener(event: string, handler: () => void): void;
  handler?: () => void;
}

function fakeButton(value: string): FakeButton {
  const button: FakeButton = {
    value,
    getAttribute: (name) => (name === "data-value" ? value : null),
    setAttribute: vi.fn(),
    classList: { toggle: vi.fn() },
    addEventListener: (_event, handler) => {
      button.handler = handler;
    },
  };
  return button;
}

function fakeGroup(values: string[], selected: string, extra: string[] = []): { group: HTMLElement; select: HTMLSelectElement; buttons: FakeButton[] } {
  const buttons = [...values, ...extra].map((value) => fakeButton(value));
  const group = { children: buttons as unknown as HTMLCollection } as unknown as HTMLElement;
  const select = { value: selected, dispatchEvent: vi.fn() } as unknown as HTMLSelectElement;
  return { group, select, buttons };
}

describe("ChoiceGroup", () => {
  test("set marks the matching button active and updates aria-pressed", () => {
    const { group, select, buttons } = fakeGroup(["S", "M", "L", "XL"], "S");
    const choice = new ChoiceGroup(group, select, ["S", "M", "L", "XL"]);
    choice.set("L");

    expect(buttons[0].classList.toggle).toHaveBeenCalledWith("active", false);
    expect(buttons[2].classList.toggle).toHaveBeenCalledWith("active", true);
    expect(buttons[0].setAttribute).toHaveBeenCalledWith("aria-pressed", "false");
    expect(buttons[2].setAttribute).toHaveBeenCalledWith("aria-pressed", "true");
  });

  test("clicking a button updates the select, toggles visuals and dispatches an input event", () => {
    const { group, select, buttons } = fakeGroup(["S", "M", "L", "XL"], "S");
    const choice = new ChoiceGroup(group, select, ["S", "M", "L", "XL"]);
    buttons[1].handler?.();

    expect(select.value).toBe("M");
    expect((select as unknown as { dispatchEvent: ReturnType<typeof vi.fn> }).dispatchEvent).toHaveBeenCalled();
    const event = (select as unknown as { dispatchEvent: ReturnType<typeof vi.fn> }).dispatchEvent.mock.calls[0][0];
    expect(event.type).toBe("input");
    expect(event.bubbles).toBe(true);
    expect(buttons[0].classList.toggle).toHaveBeenCalledWith("active", false);
    expect(buttons[1].classList.toggle).toHaveBeenCalledWith("active", true);
    expect(buttons[1].setAttribute).toHaveBeenCalledWith("aria-pressed", "true");
  });

  test("ignores clicks on buttons whose value is not in the configured list", () => {
    const { group, select, buttons } = fakeGroup(["S", "M", "L", "XL"], "S", ["?"]);
    const choice = new ChoiceGroup(group, select, ["S", "M", "L", "XL"]);
    buttons[4].handler?.();

    expect(select.value).toBe("S");
    expect((select as unknown as { dispatchEvent: ReturnType<typeof vi.fn> }).dispatchEvent).not.toHaveBeenCalled();
  });
});
