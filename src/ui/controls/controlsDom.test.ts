import { setText } from "./controlsDom";

function countingTextElement(initial: string): { el: HTMLElement; writes: () => number } {
  let stored = initial;
  let writes = 0;
  const el = {} as HTMLElement;
  Object.defineProperty(el, "textContent", { get: () => stored, set: (value: string) => { writes++; stored = value; } });
  return { el, writes: () => writes };
}

describe("setText", () => {
  test("skips the DOM write when the text is unchanged", () => {
    const { el, writes } = countingTextElement("same");
    setText(el, "same");
    expect(writes()).toBe(0);
    expect(el.textContent).toBe("same");
    setText(el, "other");
    expect(writes()).toBe(1);
    expect(el.textContent).toBe("other");
  });
});
