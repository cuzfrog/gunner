import { fakeDocument } from "../../testing";
import { html } from "./html";

function expectElement(result: Element | DocumentFragment): HTMLElement {
  if (!(result instanceof Element)) throw new Error("Expected Element");
  return result as HTMLElement;
}

beforeEach(() => {
  globalThis.document = fakeDocument() as unknown as Document;
});

test("single element with no children", () => {
  const el = expectElement(html`<div></div>`);
  expect(el.tagName).toBe("DIV");
  expect(el.childElementCount).toBe(0);
});

test("single element with literal text child", () => {
  const el = expectElement(html`<div>Hello</div>`);
  expect(el.tagName).toBe("DIV");
  expect(el.textContent).toBe("Hello");
});

test("single element with interpolated text child", () => {
  const el = expectElement(html`<div>${"hello"}</div>`);
  expect(el.textContent).toBe("hello");
});

test("single element with number interpolation", () => {
  const el = expectElement(html`<span>${42}</span>`);
  expect(el.textContent).toBe("42");
});

test("mixed literal and interpolated text", () => {
  const el = expectElement(html`<div>Hello ${"world"}</div>`);
  expect(el.textContent).toBe("Hello world");
});

test("literal attributes", () => {
  const el = expectElement(html`<div class="foo" id="bar" role="group"></div>`);
  expect(el.className).toBe("foo");
  expect(el.id).toBe("bar");
  expect(el.getAttribute("role")).toBe("group");
});

test("interpolated attribute value", () => {
  const el = expectElement(html`<div title=${"tooltip"}></div>`);
  expect(el.getAttribute("title")).toBe("tooltip");
});

test("interpolated attribute inside quotes", () => {
  const el = expectElement(html`<div class="base ${"extra"}"></div>`);
  expect(el.className).toBe("base extra");
});

test("boolean attribute disabled", () => {
  const el = expectElement(html`<button disabled>Click</button>`);
  expect(el.getAttribute("disabled")).toBe("");
});

test("boolean attribute hidden", () => {
  const el = expectElement(html`<div hidden>Secret</div>`);
  expect(el.hidden).toBe(true);
});

test("boolean attribute absent", () => {
  const el = expectElement(html`<button>Click</button>`);
  expect(el.getAttribute("disabled")).toBe(null);
});

test("nested elements", () => {
  const el = expectElement(html`<ul><li>first</li><li>second</li></ul>`);
  expect(el.tagName).toBe("UL");
  expect(el.childElementCount).toBe(2);
  expect(el.children[0].tagName).toBe("LI");
  expect(el.children[0].textContent).toBe("first");
  expect(el.children[1].textContent).toBe("second");
});

test("element with interpolated element child", () => {
  const child = expectElement(html`<span>inner</span>`);
  const el = expectElement(html`<div>${child}</div>`);
  expect(el.tagName).toBe("DIV");
  expect(el.childElementCount).toBe(1);
  expect(el.children[0].tagName).toBe("SPAN");
  expect(el.children[0].textContent).toBe("inner");
});

test("fragment with multiple element children", () => {
  const frag = html`${html`<li>a</li>`}${html`<li>b</li>`}`;
  expect(frag.nodeType).toBe(11);
  expect(frag.childElementCount).toBe(2);
  expect(frag.children[0].textContent).toBe("a");
  expect(frag.children[1].textContent).toBe("b");
});

test("falsy values are omitted", () => {
  const el = expectElement(html`<div>${null}${undefined}${false}</div>`);
  expect(el.childElementCount).toBe(0);
  expect(el.textContent).toBe("");
});

test("falsy values in attributes are omitted", () => {
  const el = expectElement(html`<div class="base ${null} ${undefined} ${false}"></div>`);
  expect(el.className).toBe("base");
});

test("class merging with array", () => {
  const el = expectElement(html`<div class="base ${["a", "b"]}"></div>`);
  expect(el.className).toBe("base a b");
});

test("class merging with conditional array containing falsy", () => {
  const el = expectElement(html`<div class="base ${["a", null, false, "b"]}"></div>`);
  expect(el.className).toBe("base a b");
});

test("array of element children", () => {
  const items = [html`<li>a</li>`, html`<li>b</li>`, html`<li>c</li>`];
  const el = expectElement(html`<ul>${items}</ul>`);
  expect(el.childElementCount).toBe(3);
  expect(el.children[0].textContent).toBe("a");
  expect(el.children[2].textContent).toBe("c");
});

test("array of element children with fragment", () => {
  const items = [html`<li>a</li>`, html`<li>b</li>`];
  const frag = html`${items}`;
  expect(frag.nodeType).toBe(11);
  expect(frag.childElementCount).toBe(2);
});

test("text is escaped via textContent not innerHTML", () => {
  const el = expectElement(html`<div>${"<script>alert(1)</script>"}</div>`);
  expect(el.textContent).toBe("<script>alert(1)</script>");
  expect(el.childElementCount).toBe(0);
});

test("data attributes", () => {
  const el = expectElement(html`<div data-value="turret" data-index="0"></div>`);
  expect(el.dataset.value).toBe("turret");
  expect(el.dataset.index).toBe("0");
});

test("aria attributes", () => {
  const el = expectElement(html`<button aria-pressed="true" aria-label="Select">Select</button>`);
  expect(el.getAttribute("aria-pressed")).toBe("true");
  expect(el.getAttribute("aria-label")).toBe("Select");
});

test("interpolated aria attribute", () => {
  const el = expectElement(html`<button aria-pressed=${"true"}>Select</button>`);
  expect(el.getAttribute("aria-pressed")).toBe("true");
});

test("deeply nested elements", () => {
  const el = expectElement(html`<div class="outer"><div class="inner"><span>deep</span></div></div>`);
  expect(el.className).toBe("outer");
  expect(el.childElementCount).toBe(1);
  expect(el.children[0].className).toBe("inner");
  expect(el.children[0].childElementCount).toBe(1);
  expect(el.children[0].children[0].tagName).toBe("SPAN");
  expect(el.children[0].children[0].textContent).toBe("deep");
});

test("mixed text and element children", () => {
  const child = expectElement(html`<span>world</span>`);
  const el = expectElement(html`<div>Hello ${child}</div>`);
  expect(el.childElementCount).toBe(1);
  expect(el.firstElementChild?.tagName).toBe("SPAN");
  expect(el.firstElementChild?.textContent).toBe("world");
});

test("self-closing tag", () => {
  const el = expectElement(html`<input type="number" value="42">`);
  expect(el.tagName).toBe("INPUT");
  expect(el.getAttribute("type")).toBe("number");
  expect(el.getAttribute("value")).toBe("42");
});

test("img element", () => {
  const el = expectElement(html`<img src="icon.png" alt="">`);
  expect(el.tagName).toBe("IMG");
  expect(el.getAttribute("src")).toBe("icon.png");
  expect(el.getAttribute("alt")).toBe("");
});
