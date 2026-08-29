import { fakeDocument, FakeElement } from "../../testing";
import { IconActionImpl } from "./iconAction";

beforeEach(() => {
  globalThis.document = fakeDocument() as unknown as Document;
});

describe("IconActionImpl", () => {
  const shape = {
    buttonClass: "icon-button",
    iconSvg: '<svg aria-hidden="true"><use href="icons.svg#delete"></use></svg>',
    title: "Delete",
  };

  test("creates a button with type, class, title, and aria-label", () => {
    const action = new IconActionImpl(shape);
    const button = action.create(() => {});
    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("type")).toBe("button");
    expect(button.className).toBe("icon-button");
    expect(button.getAttribute("title")).toBe("Delete");
    expect(button.getAttribute("aria-label")).toBe("Delete");
  });

  test("sets innerHTML to the SVG string", () => {
    const action = new IconActionImpl(shape);
    const button = action.create(() => {});
    expect(button.innerHTML).toBe(shape.iconSvg);
  });

  test("uses ariaLabel when provided instead of title", () => {
    const action = new IconActionImpl({ ...shape, ariaLabel: "Remove fitting" });
    const button = action.create(() => {});
    expect(button.getAttribute("aria-label")).toBe("Remove fitting");
  });

  test("sets aria-pressed when provided", () => {
    const action = new IconActionImpl({ ...shape, ariaPressed: true });
    const button = action.create(() => {});
    expect(button.getAttribute("aria-pressed")).toBe("true");
  });

  test("sets disabled when provided", () => {
    const action = new IconActionImpl({ ...shape, disabled: true });
    const button = action.create(() => {});
    expect(button.getAttribute("disabled")).toBe("");
  });

  test("sets data-index when provided as number", () => {
    const action = new IconActionImpl({ ...shape, dataIndex: 2 });
    const button = action.create(() => {});
    expect(button.getAttribute("data-index")).toBe("2");
  });

  test("sets aria-haspopup, aria-expanded, and aria-controls", () => {
    const action = new IconActionImpl({
      ...shape,
      ariaHaspopup: "menu",
      ariaExpanded: false,
      ariaControls: "ship-a-popup",
    });
    const button = action.create(() => {});
    expect(button.getAttribute("aria-haspopup")).toBe("menu");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(button.getAttribute("aria-controls")).toBe("ship-a-popup");
  });

  test("attaches click listener", () => {
    const action = new IconActionImpl(shape);
    let clicked = false;
    const button = action.create(() => { clicked = true; });
    (button as unknown as FakeElement).trigger("click");
    expect(clicked).toBe(true);
  });
});
