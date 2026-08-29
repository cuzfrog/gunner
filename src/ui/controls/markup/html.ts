type ChildValue = string | number | Element | DocumentFragment | readonly ChildValue[] | null | undefined | false;

interface AttrSegment {
  readonly text: string;
  readonly marker: number;
}

interface ParsedAttr {
  readonly name: string;
  readonly segments: readonly AttrSegment[];
}

interface TextNode { readonly kind: "text"; readonly text: string }
interface InterpNode { readonly kind: "interp"; readonly value: ChildValue }
interface ElementNode { readonly kind: "element"; readonly tagName: string; readonly attrs: readonly ParsedAttr[]; readonly children: readonly ParserNode[] }
type ParserNode = TextNode | InterpNode | ElementNode;

const MARKER = "\x00";

const VOID_ELEMENTS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);

function interleave(strings: readonly string[], values: readonly ChildValue[]): string {
  let result = "";
  for (let i = 0; i < strings.length; i++) {
    result += strings[i];
    if (i < values.length) result += `${MARKER}${i}${MARKER}`;
  }
  return result;
}

function isMarkerAt(text: string, pos: number): boolean {
  return text[pos] === MARKER;
}

function readMarker(text: string, pos: number): { index: number; end: number } {
  const end = text.indexOf(MARKER, pos + 1);
  return { index: parseInt(text.slice(pos + 1, end), 10), end: end + 1 };
}

function resolveAttrValue(value: ChildValue): string | null {
  if (value === null || value === undefined || value === false) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    const tokens: string[] = [];
    for (const item of value) {
      if (typeof item === "string") {
        for (const t of item.split(/\s+/)) if (t) tokens.push(t);
      } else if (typeof item === "number") {
        tokens.push(String(item));
      }
    }
    return tokens.join(" ");
  }
  return null;
}

function resolveClassSegments(segments: readonly AttrSegment[], values: readonly ChildValue[]): string {
  const tokens: string[] = [];
  for (const seg of segments) {
    if (seg.marker >= 0) {
      const value = values[seg.marker];
      if (typeof value === "string") {
        for (const t of value.split(/\s+/)) if (t) tokens.push(t);
      } else if (typeof value === "number") {
        tokens.push(String(value));
      } else if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === "string") {
            for (const t of item.split(/\s+/)) if (t) tokens.push(t);
          } else if (typeof item === "number") {
            tokens.push(String(item));
          }
        }
      }
    } else {
      for (const t of seg.text.split(/\s+/)) if (t) tokens.push(t);
    }
  }
  return tokens.join(" ");
}

function resolveAttrSegments(segments: readonly AttrSegment[], values: readonly ChildValue[]): string | null {
  let result = "";
  let hasValue = false;
  for (const seg of segments) {
    if (seg.marker >= 0) {
      const resolved = resolveAttrValue(values[seg.marker]);
      if (resolved !== null) { result += resolved; hasValue = true; }
    } else {
      result += seg.text;
      if (seg.text) hasValue = true;
    }
  }
  return hasValue ? result : null;
}

function applyAttribute(el: Element, attr: ParsedAttr, values: readonly ChildValue[]): void {
  const { name, segments } = attr;
  if (name === "class") {
    const className = resolveClassSegments(segments, values);
    if (className) el.setAttribute("class", className);
    return;
  }
  const isBoolean = name === "hidden" || name === "disabled" || name === "checked";
  if (isBoolean) {
    const hasLiteral = segments.some((s) => s.marker < 0);
    const hasMarker = segments.some((s) => s.marker >= 0);
    if (hasLiteral && !hasMarker) {
      el.setAttribute(name, "");
      return;
    }
    if (hasMarker) {
      const resolved = resolveAttrSegments(segments, values);
      if (resolved !== null && resolved !== "false") el.setAttribute(name, "");
    }
    return;
  }
  const hasMarker = segments.some((s) => s.marker >= 0);
  if (!hasMarker) {
    let literal = "";
    for (const seg of segments) literal += seg.text;
    el.setAttribute(name, literal);
    return;
  }
  const resolved = resolveAttrSegments(segments, values);
  if (resolved !== null) el.setAttribute(name, resolved);
}

class TemplateParser {
  private pos = 0;

  constructor(private readonly input: string, private readonly values: readonly ChildValue[]) {}

  parse(): Element | DocumentFragment {
    const nodes = this.parseNodes();
    if (nodes.length === 1 && nodes[0].kind === "element") return buildElement(nodes[0], this.values);
    const frag = document.createDocumentFragment();
    for (const node of nodes) appendNode(frag, buildNode(node, this.values));
    return frag;
  }

  private parseNodes(): ParserNode[] {
    const nodes: ParserNode[] = [];
    let textBuffer = "";
    while (this.pos < this.input.length) {
      if (this.peek() === "<" && this.peek(1) === "/") break;
      if (this.peek() === "<") {
        if (textBuffer) { nodes.push({ kind: "text", text: textBuffer }); textBuffer = ""; }
        nodes.push(this.parseElement());
        continue;
      }
      if (isMarkerAt(this.input, this.pos)) {
        if (textBuffer) { nodes.push({ kind: "text", text: textBuffer }); textBuffer = ""; }
        const { index, end } = readMarker(this.input, this.pos);
        this.pos = end;
        const value = this.values[index];
        if (value !== null && value !== undefined && value !== false) {
          nodes.push({ kind: "interp", value });
        }
        continue;
      }
      textBuffer += this.input[this.pos];
      this.pos++;
    }
    if (textBuffer) nodes.push({ kind: "text", text: textBuffer });
    return nodes;
  }

  private parseElement(): ElementNode {
    this.expect("<");
    const tagName = this.parseName();
    const attrs = this.parseAttributes();
    const selfClosing = this.peek() === "/";
    if (selfClosing) this.pos++;
    this.expect(">");
    let children: ParserNode[] = [];
    if (!selfClosing && !VOID_ELEMENTS.has(tagName.toLowerCase())) {
      children = this.parseNodes();
      this.expect("<");
      this.expect("/");
      const closingName = this.parseName();
      this.expect(">");
      if (closingName !== tagName) throw new Error(`Mismatched closing tag: expected ${tagName}, got ${closingName}`);
    }
    return { kind: "element", tagName, attrs, children };
  }

  private parseAttributes(): ParsedAttr[] {
    const attrs: ParsedAttr[] = [];
    while (true) {
      this.skipWhitespace();
      if (this.peek() === ">" || this.peek() === "/") break;
      const name = this.parseName();
      this.skipWhitespace();
      if (this.peek() !== "=") {
        attrs.push({ name, segments: [{ text: "", marker: -1 }] });
        continue;
      }
      this.pos++;
      this.skipWhitespace();
      attrs.push({ name, segments: this.parseAttrSegments() });
    }
    return attrs;
  }

  private parseAttrSegments(): AttrSegment[] {
    const ch = this.peek();
    if (ch === '"' || ch === "'") {
      this.pos++;
      const segments: AttrSegment[] = [];
      let literal = "";
      while (this.pos < this.input.length && this.peek() !== ch) {
        if (isMarkerAt(this.input, this.pos)) {
          if (literal) { segments.push({ text: literal, marker: -1 }); literal = ""; }
          const { index, end } = readMarker(this.input, this.pos);
          this.pos = end;
          segments.push({ text: "", marker: index });
        } else {
          literal += this.input[this.pos];
          this.pos++;
        }
      }
      if (literal) segments.push({ text: literal, marker: -1 });
      this.pos++;
      return segments;
    }
    if (isMarkerAt(this.input, this.pos)) {
      const { index, end } = readMarker(this.input, this.pos);
      this.pos = end;
      return [{ text: "", marker: index }];
    }
    let literal = "";
    while (this.pos < this.input.length && !/\s/.test(this.peek()) && this.peek() !== ">" && this.peek() !== "/") {
      literal += this.input[this.pos];
      this.pos++;
    }
    return [{ text: literal, marker: -1 }];
  }

  private parseName(): string {
    let name = "";
    while (this.pos < this.input.length && /[\w-]/.test(this.peek())) {
      name += this.input[this.pos];
      this.pos++;
    }
    if (!name) throw new Error(`Expected name at position ${this.pos}`);
    return name;
  }

  private skipWhitespace(): void {
    while (this.pos < this.input.length && /\s/.test(this.peek())) this.pos++;
  }

  private peek(offset = 0): string {
    return this.input[this.pos + offset] ?? "";
  }

  private expect(ch: string): void {
    if (this.peek() !== ch) throw new Error(`Expected '${ch}' at position ${this.pos}, got '${this.peek()}'`);
    this.pos++;
  }
}

function isTextOnly(nodes: readonly ParserNode[], values: readonly ChildValue[]): boolean {
  for (const node of nodes) {
    if (node.kind === "text") continue;
    if (node.kind === "interp") {
      const value = node.value;
      if (typeof value === "string" || typeof value === "number") continue;
      if (value === null || value === undefined || value === false) continue;
      return false;
    }
    return false;
  }
  return true;
}

function buildElement(node: ElementNode, values: readonly ChildValue[]): Element {
  const el = document.createElement(node.tagName);
  for (const attr of node.attrs) applyAttribute(el, attr, values);
  if (isTextOnly(node.children, values)) {
    let text = "";
    for (const child of node.children) {
      if (child.kind === "text") text += child.text;
      else if (child.kind === "interp") {
        if (typeof child.value === "string") text += child.value;
        else if (typeof child.value === "number") text += String(child.value);
      }
    }
    if (text) el.textContent = text;
  } else {
    for (const child of node.children) appendNode(el, buildNode(child, values));
  }
  return el;
}

function buildNode(node: ParserNode, values: readonly ChildValue[]): Node {
  if (node.kind === "text") return document.createTextNode(node.text);
  if (node.kind === "interp") return buildChildValue(node.value);
  return buildElement(node, values);
}

function buildChildValue(value: ChildValue): Node {
  if (value === null || value === undefined || value === false) return document.createTextNode("");
  if (typeof value === "string") return document.createTextNode(value);
  if (typeof value === "number") return document.createTextNode(String(value));
  if (Array.isArray(value)) {
    const frag = document.createDocumentFragment();
    for (const item of value) appendNode(frag, buildChildValue(item));
    return frag;
  }
  return value as Element | DocumentFragment;
}

function appendNode(parent: Element | DocumentFragment, node: Node): void {
  parent.appendChild(node);
}

export function html(strings: readonly string[], ...values: ChildValue[]): Element | DocumentFragment {
  const input = interleave(strings, values);
  const parser = new TemplateParser(input, values);
  return parser.parse();
}
