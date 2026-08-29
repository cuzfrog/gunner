import { fakeDocument } from "../../testing";
import { SelectableListImpl, type SelectableItem, type SelectableListShape } from "./selectableList";

beforeEach(() => {
  globalThis.document = fakeDocument() as unknown as Document;
});

function item(overrides: Partial<SelectableItem> = {}): SelectableItem {
  return { value: "opt-1", label: "Option 1", selected: false, ...overrides };
}

function shape(overrides: Partial<SelectableListShape> = {}): SelectableListShape {
  return { itemClass: "test-item", nameClass: "test-item-name", ...overrides };
}

describe("SelectableList.createButton", () => {
  test("creates a button with type, class, and label span", () => {
    const list = new SelectableListImpl(shape());
    const button = list.createButton(item());
    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("type")).toBe("button");
    expect(button.className).toBe("test-item");
    expect(button.childElementCount).toBe(1);
    const span = button.firstElementChild as HTMLElement;
    expect(span.tagName).toBe("SPAN");
    expect(span.className).toBe("test-item-name truncate");
    expect(span.textContent).toBe("Option 1");
  });

  test("sets aria-current when selected", () => {
    const list = new SelectableListImpl(shape());
    const button = list.createButton(item({ selected: true }));
    expect(button.getAttribute("aria-current")).toBe("true");
  });

  test("does not set aria-current when not selected", () => {
    const list = new SelectableListImpl(shape());
    const button = list.createButton(item({ selected: false }));
    expect(button.getAttribute("aria-current")).toBe(null);
  });

  test("sets role when provided", () => {
    const list = new SelectableListImpl(shape({ role: "menuitem" }));
    const button = list.createButton(item());
    expect(button.getAttribute("role")).toBe("menuitem");
  });

  test("sets data-value", () => {
    const list = new SelectableListImpl(shape());
    const button = list.createButton(item({ value: "missile-1" }));
    expect(button.getAttribute("data-value")).toBe("missile-1");
  });

  test("sets title on button", () => {
    const list = new SelectableListImpl(shape());
    const button = list.createButton(item({ title: "Some hint" }));
    expect(button.getAttribute("title")).toBe("Some hint");
  });

  test("sets title on name span matching label", () => {
    const list = new SelectableListImpl(shape());
    const button = list.createButton(item({ label: "Long Name" }));
    const span = button.firstElementChild as HTMLElement;
    expect(span.getAttribute("title")).toBe("Long Name");
  });

  test("adds icon img when iconUrl provided", () => {
    const list = new SelectableListImpl(shape({ iconClass: "test-icon" }));
    const button = list.createButton(item({ iconUrl: "icon.png" }));
    expect(button.childElementCount).toBe(2);
    const img = button.children[0] as HTMLElement;
    expect(img.tagName).toBe("IMG");
    expect(img.className).toBe("test-icon");
    expect(img.getAttribute("src")).toBe("icon.png");
    expect(img.getAttribute("alt")).toBe("");
  });

  test("omits icon when iconUrl not provided", () => {
    const list = new SelectableListImpl(shape({ iconClass: "test-icon" }));
    const button = list.createButton(item({ iconUrl: undefined }));
    expect(button.childElementCount).toBe(1);
    expect(button.children[0].tagName).toBe("SPAN");
  });

  test("adds quantity span when quantity provided", () => {
    const list = new SelectableListImpl(shape({ quantityClass: "test-quantity" }));
    const button = list.createButton(item({ quantity: "x42" }));
    expect(button.childElementCount).toBe(2);
    const qty = button.children[1] as HTMLElement;
    expect(qty.tagName).toBe("SPAN");
    expect(qty.className).toBe("test-quantity");
    expect(qty.textContent).toBe("x42");
  });

  test("omits quantity span when not provided", () => {
    const list = new SelectableListImpl(shape({ quantityClass: "test-quantity" }));
    const button = list.createButton(item());
    expect(button.childElementCount).toBe(1);
  });

  test("adds extra button class when provided", () => {
    const list = new SelectableListImpl(shape({ extraButtonClass: "btn" }));
    const button = list.createButton(item());
    expect(button.className).toBe("test-item btn");
  });

  test("sets disabled attribute when disabled", () => {
    const list = new SelectableListImpl(shape());
    const button = list.createButton(item({ disabled: true }));
    expect(button.getAttribute("disabled")).toBe("");
  });

  test("uses textContent directly when nameClass is empty", () => {
    const list = new SelectableListImpl(shape({ nameClass: "" }));
    const button = list.createButton(item({ label: "Plain text" }));
    expect(button.childElementCount).toBe(0);
    expect(button.textContent).toBe("Plain text");
  });
});

describe("SelectableList.render", () => {
  test("clears container and appends buttons", () => {
    const list = new SelectableListImpl(shape());
    const container = document.createElement("div") as unknown as HTMLElement;
    container.appendChild(document.createElement("span"));
    const buttons = list.render(container, [item({ value: "a" }), item({ value: "b" })]);
    expect(buttons.length).toBe(2);
    expect(container.childElementCount).toBe(2);
    expect(container.children[0].tagName).toBe("BUTTON");
    expect(container.children[1].tagName).toBe("BUTTON");
  });

  test("wraps buttons in li when wrapInListItem is true", () => {
    const list = new SelectableListImpl(shape({ wrapInListItem: true }));
    const container = document.createElement("ul") as unknown as HTMLElement;
    const buttons = list.render(container, [item({ value: "a" }), item({ value: "b" })]);
    expect(buttons.length).toBe(2);
    expect(container.childElementCount).toBe(2);
    expect(container.children[0].tagName).toBe("LI");
    expect(container.children[0].childElementCount).toBe(1);
    expect(container.children[0].children[0].tagName).toBe("BUTTON");
    expect(buttons[0].tagName).toBe("BUTTON");
  });

  test("returns empty array for empty items", () => {
    const list = new SelectableListImpl(shape());
    const container = document.createElement("div") as unknown as HTMLElement;
    const buttons = list.render(container, []);
    expect(buttons.length).toBe(0);
    expect(container.childElementCount).toBe(0);
  });

  test("returned buttons have data-value for listener attachment", () => {
    const list = new SelectableListImpl(shape());
    const container = document.createElement("div") as unknown as HTMLElement;
    const buttons = list.render(container, [item({ value: "x" })]);
    expect(buttons[0].getAttribute("data-value")).toBe("x");
  });
});
