import MagicString, { type SourceMap } from "magic-string";
import { parseSync } from "oxc-parser";
import { decode } from "./entities.js";

/** An oxc AST node, read loosely. */
interface Node {
  type: string;
  start: number;
  end: number;
  [key: string]: any;
}

/** Source code to keep as written, called with `thunk` when it is wrapped in one. */
interface Kept {
  node: Node;
  thunk: boolean;
}

/** Generated code, and the source code kept between it, in source order. */
type Part = string | Kept;

/** An element of a template, with its static attributes and children. */
interface Element {
  kind: "element";
  tag: string;
  svg: boolean;
  attributes: string;
  children: Slot[];
  ref?: string;
  needed?: boolean;
}

/** A static text or an empty comment of a template. */
interface Leaf {
  kind: "text" | "comment";
  text: string;
  ref?: string;
  needed?: boolean;
}

type Slot = Element | Leaf;

/** A step that runs on a clone of a template, see {@link render}. */
type Operation =
  | { kind: "attr" | "event"; target: Element; name: string; value: Part[] }
  | {
      kind: "insert";
      target: Element;
      marker?: Slot;
      value: Part[];
      /** The target is empty and this is its only insert: write text. */
      text?: boolean;
    }
  | {
      kind: "cond";
      target: Element;
      state: Part[];
      key: Part[];
      yes: string;
      no: string;
    };

interface Context {
  code: string;
  out: MagicString;
  /** Helpers used, by name, with their local names. */
  helpers: Map<string, string>;
  /** Template declarations, by `svg` flag and HTML. */
  templates: Map<string, string>;
  /** Delegated events used. */
  events: Set<string>;
  /** Last number used for a local name. */
  count: number;
  /** Whether the current JSX awaits or yields, so it can't use a closure. */
  inline: boolean;
  changed: boolean;
}

/** The JSX runtime uses the automatic runtime's `key`, never an attribute. */
const IGNORED = new Set(["key"]);

const ALIASES: Record<string, string> = { className: "class", htmlFor: "for" };

/** Set as properties by the runtime, so never written into templates. */
const PROPERTIES = new Set(["value", "checked", "selected"]);

/** Bubbling events handled by one listener on the document. */
const DELEGATED = new Set(
  (
    "beforeinput click contextmenu dblclick focusin focusout input keydown " +
    "keyup mousedown mousemove mouseout mouseover mouseup pointerdown " +
    "pointermove pointerout pointerover pointerup"
  ).split(" "),
);

/** Tags the runtime creates as SVG, see `createElement`. */
const SVG_TAGS = new Set(
  (
    "svg animate animateMotion animateTransform circle clipPath defs desc " +
    "ellipse filter foreignObject g image line linearGradient marker mask " +
    "metadata mpath path pattern polygon polyline radialGradient rect set " +
    "stop switch symbol text textPath tspan use view"
  ).split(" "),
);

/** SVG tags and attributes that the HTML parser keeps camelCase. */
const SVG_CAMEL = new Set(
  (
    "animateMotion animateTransform clipPath foreignObject linearGradient " +
    "radialGradient textPath feBlend feColorMatrix feComponentTransfer " +
    "feComposite feConvolveMatrix feDiffuseLighting feDisplacementMap " +
    "feDistantLight feDropShadow feFlood feFuncA feFuncB feFuncG feFuncR " +
    "feGaussianBlur feImage feMerge feMergeNode feMorphology feOffset " +
    "fePointLight feSpecularLighting feSpotLight feTile feTurbulence " +
    "attributeName attributeType baseFrequency baseProfile calcMode " +
    "clipPathUnits diffuseConstant edgeMode filterUnits glyphRef " +
    "gradientTransform gradientUnits kernelMatrix kernelUnitLength keyPoints " +
    "keySplines keyTimes lengthAdjust limitingConeAngle markerHeight " +
    "markerUnits markerWidth maskContentUnits maskUnits numOctaves pathLength " +
    "patternContentUnits patternTransform patternUnits pointsAtX pointsAtY " +
    "pointsAtZ preserveAlpha preserveAspectRatio primitiveUnits refX refY " +
    "repeatCount repeatDur requiredExtensions requiredFeatures " +
    "specularConstant specularExponent spreadMethod startOffset stdDeviation " +
    "stitchTiles surfaceScale systemLanguage tableValues targetX targetY " +
    "textLength viewBox viewTarget xChannelSelector yChannelSelector zoomAndPan"
  ).split(" "),
);

const VOID = new Set(
  "area base br col embed hr img input link meta param source track wbr".split(
    " ",
  ),
);

/**
 * Elements whose children the HTML parser doesn't read as elements, or puts
 * elsewhere: their children are always inserted at runtime.
 */
const OPAQUE = new Set(
  (
    "iframe noembed noframes noscript plaintext script style template " +
    "textarea title xmp"
  ).split(" "),
);

/** Tags a template can't hold: created with `createElement` instead. */
const UNSUPPORTED = new Set("body frame frameset head html math".split(" "));

/** The children the HTML parser allows in table and select elements. */
const ALLOWED: Record<string, string[]> = {
  table: ["caption", "colgroup", "thead", "tbody", "tfoot"],
  thead: ["tr"],
  tbody: ["tr"],
  tfoot: ["tr"],
  tr: ["td", "th"],
  colgroup: ["col"],
  select: ["option", "optgroup", "hr"],
  optgroup: ["option"],
  option: [],
};

/** The parents the HTML parser requires for table parts. */
const PARENTS: Record<string, string[]> = {
  caption: ["table"],
  colgroup: ["table"],
  thead: ["table"],
  tbody: ["table"],
  tfoot: ["table"],
  tr: ["thead", "tbody", "tfoot"],
  td: ["tr"],
  th: ["tr"],
  col: ["colgroup"],
  rb: ["ruby"],
  rp: ["ruby", "rtc"],
  rt: ["ruby", "rtc"],
  rtc: ["ruby"],
};

/** Start tags that close an open `<p>`. */
const CLOSES_P = new Set(
  (
    "address article aside blockquote center dd details dialog dir div dl dt " +
    "fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hgroup " +
    "hr li listing main menu nav ol p plaintext pre search section summary " +
    "table ul xmp"
  ).split(" "),
);

/** Elements that stop the search for an open `<p>`. */
const SCOPES = new Set(
  (
    "applet button caption desc foreignObject html marquee object table td " +
    "template th title"
  ).split(" "),
);

const HEADINGS = new Set("h1 h2 h3 h4 h5 h6".split(" "));

/** Elements whose text the HTML parser moves out of the table. */
const TABLES = new Set("table thead tbody tfoot tr colgroup".split(" "));

const FUNCTIONS = new Set([
  "ArrowFunctionExpression",
  "FunctionExpression",
  "FunctionDeclaration",
  "ClassBody",
]);

/** Wrappers that don't change what an expression reads. */
const WRAPPERS = new Set([
  "ParenthesizedExpression",
  "TSAsExpression",
  "TSSatisfiesExpression",
  "TSNonNullExpression",
  "TSTypeAssertion",
]);

/**
 * Compiles the JSX of a module into template clones and DOM bindings: any
 * expression in JSX that may read a state's `.value` updates the DOM when it
 * changes. Returns `null` when there is nothing to compile, or when the code
 * doesn't parse, so the bundler reports the error.
 *
 * @param code - Source of a `.jsx`, `.tsx` or `.js` module.
 * @param id - Its path, used to tell TypeScript and in the source map.
 */
export function compile(
  code: string,
  id: string,
): { code: string; map: SourceMap } | null {
  if (!/<|\.map\s*\(/.test(code)) return null;

  const lang = /\.[cm]?tsx$/.test(id)
    ? "tsx"
    : /\.[cm]?ts$/.test(id)
      ? "ts"
      : "jsx";
  const { program, errors } = parseSync(id, code, {
    lang,
    sourceType: "module",
    preserveParens: true,
  });
  if (errors.length) return null;

  const context: Context = {
    code,
    out: new MagicString(code),
    helpers: new Map(),
    templates: new Map(),
    events: new Set(),
    count: 0,
    inline: false,
    changed: false,
  };
  visit(context, program as unknown as Node, false);
  if (!context.changed) return null;

  prepend(context, program as unknown as Node);
  return {
    code: context.out.toString(),
    map: context.out.generateMap({
      hires: true,
      source: id,
      includeContent: true,
    }),
  };
}

/**
 * Compiles the JSX in `node`, and rewrites `.map()` calls with a callback
 * returning JSX, and, in a `thunk`, `a.value === b` comparisons. It edits the
 * innermost code first, so edits that meet at a position nest correctly.
 */
function visit(context: Context, node: Node, thunk: boolean) {
  if (returns(context, node)) return;

  if (node.type === "JSXElement" || node.type === "JSXFragment") {
    const inline = context.inline;
    context.inline = inline || awaits(node);
    emit(context, node, jsx(context, node));
    context.inline = inline;
    return;
  }

  const inner = thunk && !FUNCTIONS.has(node.type);
  for (const child of children(node)) visit(context, child, inner);

  if (thunk) select(context, node);
  if (node.type === "CallExpression") map(context, node);
}

/**
 * Compiles a function whose body is one `return` of a host element into
 * statements instead of a call of a template function, so calling it costs
 * no closure. Returns whether it did.
 */
function returns(context: Context, node: Node): boolean {
  if (!FUNCTIONS.has(node.type)) return false;

  const { body } = node;
  if (!body || body.type !== "BlockStatement" || body.body.length !== 1) {
    return false;
  }

  const statement = body.body[0];
  if (statement.type !== "ReturnStatement" || !statement.argument) return false;

  const element = unwrap(statement.argument);
  if (element.type !== "JSXElement") return false;

  const tag = tagOf(context, element.openingElement.name);
  const inline = context.inline;
  context.inline = inline || awaits(element);
  const host =
    !tag.component && !context.inline && !fallback(element, tag.host);
  const parts = host ? template(context, element, tag.host, true) : null;
  context.inline = inline;
  if (!parts) return false;

  emit(context, body, ["{ ", ...parts, "}"]);
  return true;
}

/** The child nodes of `node`, in source order. */
function children(node: Node) {
  const nodes: Node[] = [];

  for (const key in node) {
    if (key === "parent") continue;
    const value = node[key];

    if (Array.isArray(value)) {
      for (const item of value) if (item?.type) nodes.push(item);
    } else if (value && typeof value === "object" && value.type) {
      nodes.push(value);
    }
  }

  return nodes.sort((a, b) => a.start - b.start);
}

/** Whether `node` contains a node for which `test` is true, outside of functions. */
function has(
  node: Node,
  test: (node: Node) => boolean,
  functions = false,
): boolean {
  if (test(node)) return true;
  if (!functions && FUNCTIONS.has(node.type)) return false;
  return children(node).some((child) => has(child, test, functions));
}

/** Whether the JSX in `node` awaits or yields, outside of functions. */
function awaits(node: Node) {
  return has(
    node,
    (n) => n.type === "AwaitExpression" || n.type === "YieldExpression",
  );
}

function helper(context: Context, name: string) {
  let local = context.helpers.get(name);
  if (!local) context.helpers.set(name, (local = `_$${name}`));
  return local;
}

function local(context: Context, prefix: string) {
  return `_${prefix}$${++context.count}`;
}

/**
 * Replaces the JSX `node` with `parts`: generated code replaces the source
 * between the kept nodes, which are compiled in turn.
 */
function emit(context: Context, node: Node, parts: Part[]) {
  const { out } = context;
  let cursor = node.start;
  let pending = "";

  context.changed = true;

  for (const part of parts) {
    if (typeof part === "string") {
      pending += part;
      continue;
    }

    visit(context, part.node, part.thunk);
    if (part.node.start > cursor) out.update(cursor, part.node.start, pending);
    else if (pending) out.prependRight(cursor, pending);
    cursor = part.node.end;
    pending = "";
  }

  out.update(cursor, node.end, pending);
}

/** Generates the code for a JSX element or fragment. */
function jsx(context: Context, node: Node): Part[] {
  if (node.type === "JSXFragment") {
    return [
      `${helper(context, "group")}([`,
      ...list(context, node.children, false),
      "])",
    ];
  }

  const tag = tagOf(context, node.openingElement.name);

  if (tag.component) return component(context, node, tag.component);
  if (context.inline || fallback(node, tag.host)) {
    return createElement(context, node, tag.host);
  }
  return template(context, node, tag.host);
}

/**
 * The tag of a JSX element, like Babel reads it: lowercase names and names
 * with a dash are HTML or SVG tags, anything else is a component.
 */
function tagOf(context: Context, name: Node) {
  if (name.type === "JSXIdentifier") {
    const text: string = name.name;
    if (text !== "this" && (/^[a-z]/.test(text) || text.includes("-"))) {
      return { host: text };
    }
    return { component: text, host: "" };
  }
  if (name.type === "JSXNamespacedName") {
    return { host: `${name.namespace.name}:${name.name.name}` };
  }
  return {
    component: context.code.slice(name.start, name.end),
    host: "",
  };
}

/** The name of a JSX attribute, `a:b` when namespaced. */
function nameOf(attribute: Node): string {
  const { name } = attribute;
  return name.type === "JSXNamespacedName"
    ? `${name.namespace.name}:${name.name.name}`
    : name.name;
}

/**
 * Whether a host element needs `createElement`: spreads, namespaced names,
 * a `children` attribute, a tag no template can hold, or a `<select>` whose
 * value must be set after its dynamic options.
 */
function fallback(node: Node, tag: string) {
  const attributes: Node[] = node.openingElement.attributes;

  return (
    tag.includes(":") ||
    UNSUPPORTED.has(tag) ||
    (/[A-Z]/.test(tag) && isSvg(tag) && !SVG_CAMEL.has(tag)) ||
    attributes.some(
      (attribute) =>
        attribute.type === "JSXSpreadAttribute" ||
        attribute.name.type === "JSXNamespacedName" ||
        attribute.name.name === "children",
    ) ||
    (tag === "select" &&
      attributes.some((attribute) => nameOf(attribute) === "value") &&
      node.children.some(
        (child: Node) => child.type !== "JSXText" && !isStaticChild(child),
      ))
  );
}

/** Whether a JSX child is text or an element that a template can hold. */
function isStaticChild(child: Node) {
  return (
    child.type === "JSXElement" &&
    child.openingElement.name.type === "JSXIdentifier" &&
    /^[a-z]/.test(child.openingElement.name.name) &&
    child.children.every(
      (inner: Node) => inner.type === "JSXText" || isStaticChild(inner),
    ) &&
    child.openingElement.attributes.every(
      (attribute: Node) =>
        attribute.type === "JSXAttribute" &&
        (!attribute.value || attribute.value.type === "Literal"),
    )
  );
}

function isSvg(tag: string) {
  return SVG_TAGS.has(tag) || /^fe[A-Z]/.test(tag);
}

/** An object key, quoted when it isn't an identifier. */
function key(name: string) {
  return /^[A-Za-z_$][\w$]*$/.test(name) ? name : quote(name);
}

/**
 * The value of a JSX attribute: `true` without one, strings decoded, an
 * expression kept, or a thunk of it when `reactive` and it may read a state.
 */
function attributeValue(
  context: Context,
  attribute: Node,
  reactive: boolean,
): Part[] {
  const { value } = attribute;
  if (!value) return ["true"];
  if (value.type === "Literal") return [quote(decode(value.value))];
  if (value.type !== "JSXExpressionContainer") return jsx(context, value);
  return expression(value.expression, reactive);
}

/**
 * The parts of `a.value === b ? "yes" : "no"` on `class`, compiled to one
 * keyed binding, or `null` for anything else. `!==` swaps the branches.
 */
function conditional(
  context: Context,
  attribute: Node,
): { state: Part[]; key: Part[]; yes: string; no: string } | null {
  const { value } = attribute;
  if (!value || value.type !== "JSXExpressionContainer") return null;

  const node = unwrap(value.expression);
  if (node.type !== "ConditionalExpression") return null;

  const { consequent, alternate, test } = node;
  if (
    !isLiteral(consequent) ||
    !isLiteral(alternate) ||
    test.type !== "BinaryExpression" ||
    (test.operator !== "===" && test.operator !== "!==")
  ) {
    return null;
  }

  const left = isValueRead(test.left);
  const read = left ? test.left : isValueRead(test.right) ? test.right : null;
  if (!read) return null;

  const other: Node = left ? test.right : test.left;
  if (
    isThunk(other) ||
    has(other, isValueRead) ||
    has(read.object, isValueRead)
  ) {
    return null;
  }

  const target = context.code.slice(read.object.start, read.object.end);
  if (context.code.slice(other.start, other.end).includes(`${target}.value`)) {
    return null;
  }

  const [yes, no] =
    test.operator === "==="
      ? [consequent.value, alternate.value]
      : [alternate.value, consequent.value];

  return {
    state: [{ node: read.object, thunk: false }],
    key: [{ node: other, thunk: false }],
    yes,
    no,
  };
}

/** Whether `node` is a plain string literal. */
function isLiteral(node: Node): boolean {
  return node.type === "Literal" && typeof node.value === "string";
}

/** Keeps an expression, in a thunk when `reactive` and it may read a state. */
function expression(node: Node, reactive: boolean): Part[] {
  return reactive && isThunk(node)
    ? ["() => ", { node, thunk: true }]
    : [{ node, thunk: false }];
}

/**
 * Calls a component, untracked, with its props: children always come as an
 * array, like with the runtime, and those that may read a state as thunks.
 */
function component(context: Context, node: Node, name: string): Part[] {
  const parts: Part[] = [`${helper(context, "component")}(${name}, {`];
  let explicit = false;

  for (const attribute of node.openingElement.attributes as Node[]) {
    if (attribute.type === "JSXSpreadAttribute") {
      parts.push(" ...", { node: attribute.argument, thunk: false }, ",");
      continue;
    }

    const name = nameOf(attribute);
    if (IGNORED.has(name)) continue;
    if (name === "children") explicit = true;
    parts.push(
      ` ${key(name)}: `,
      ...attributeValue(context, attribute, false),
      ",",
    );
  }

  const items = list(context, node.children, true);
  if (items.length || !explicit) parts.push(" children: [", ...items, "]");
  parts.push(" })");
  return parts;
}

/**
 * The entries of an array of JSX children, comma separated: text as strings,
 * expressions as values or thunks, elements compiled. With `nest`, fragments
 * stay fragments, like with the runtime; otherwise they are flattened.
 */
function list(context: Context, nodes: Node[], nest: boolean): Part[] {
  const parts: Part[] = [];

  for (const child of nodes) {
    let entry: Part[] | undefined;

    if (child.type === "JSXText") {
      const text = clean(child.value);
      if (text) entry = [quote(text)];
    } else if (child.type === "JSXExpressionContainer") {
      if (child.expression.type !== "JSXEmptyExpression") {
        entry = expression(child.expression, true);
      }
    } else if (child.type === "JSXSpreadChild") {
      entry = ["...", { node: child.expression, thunk: false }];
    } else if (child.type === "JSXFragment" && !nest) {
      entry = list(context, child.children, nest);
      if (!entry.length) entry = undefined;
    } else {
      entry = jsx(context, child);
    }

    if (entry) parts.push(...(parts.length ? [", "] : []), ...entry);
  }

  return parts;
}

/**
 * Calls `createElement` or `svg` from `qwrk`, for what templates can't
 * express. The tag decides the namespace statically, so the runtime never
 * checks it.
 */
function createElement(context: Context, node: Node, tag: string): Part[] {
  const name = isSvg(tag) ? "svg" : "h";
  const parts: Part[] = [`${helper(context, name)}(${quote(tag)}, {`];

  for (const attribute of node.openingElement.attributes as Node[]) {
    if (attribute.type === "JSXSpreadAttribute") {
      parts.push(" ...", { node: attribute.argument, thunk: false }, ",");
      continue;
    }

    const name = nameOf(attribute);
    if (IGNORED.has(name)) continue;
    const reactive = !name.startsWith("on");
    parts.push(
      ` ${key(name)}: `,
      ...attributeValue(context, attribute, reactive),
      ",",
    );
  }

  parts.push(" }");
  const items = list(context, node.children, true);
  if (items.length) parts.push(", ", ...items);
  parts.push(")");
  return parts;
}

/**
 * Whether an expression may read a state's `.value` when evaluated, so it
 * must be re-evaluated in a binding: any call or member access, except a
 * plain member chain without `.value`, which is passed as is, since the
 * runtime binds states. Code that awaits, yields or assigns is never wrapped.
 */
function isThunk(node: Node): boolean {
  node = unwrap(node);
  if (node.type === "Identifier" || node.type === "ThisExpression")
    return false;
  if (isChain(node)) return has(node, isValueRead, true);
  if (FUNCTIONS.has(node.type) || node.type === "Literal") return false;

  return (
    has(node, (n) =>
      /^(CallExpression|NewExpression|MemberExpression|TaggedTemplateExpression|ImportExpression)$/.test(
        n.type,
      ),
    ) &&
    !has(
      node,
      (n) =>
        /^(AwaitExpression|YieldExpression|AssignmentExpression|UpdateExpression)$/.test(
          n.type,
        ) ||
        (n.type === "UnaryExpression" && n.operator === "delete"),
    )
  );
}

function unwrap(node: Node): Node {
  while (WRAPPERS.has(node.type)) node = node.expression;
  return node.type === "ChainExpression" ? node.expression : node;
}

/** Whether `node` is `a`, `this`, or a chain of plain member accesses on one. */
function isChain(node: Node): boolean {
  if (node.type === "Identifier" || node.type === "ThisExpression") return true;
  return (
    node.type === "MemberExpression" && !node.computed && isChain(node.object)
  );
}

/** Whether `node` is `a.value`, with `a` a plain member chain. */
function isValueRead(node: Node) {
  return (
    node.type === "MemberExpression" &&
    !node.computed &&
    !node.optional &&
    node.property.name === "value" &&
    isChain(node.object)
  );
}

/**
 * Rewrites `a.value === b` and `b === a.value` to `equals(a, b)`, and `!==`
 * to `!equals(a, b)`: when `a` is a state, only a change of whether it is `b`
 * re-runs the binding, not every change of `a`.
 */
function select(context: Context, node: Node) {
  if (
    node.type !== "BinaryExpression" ||
    (node.operator !== "===" && node.operator !== "!==")
  ) {
    return;
  }

  const left = isValueRead(node.left);
  const read = left ? node.left : isValueRead(node.right) ? node.right : null;
  if (!read) return;

  const { code, out } = context;
  const other: Node = left ? node.right : node.left;
  const target = code.slice(read.object.start, read.object.end);
  if (code.slice(other.start, other.end).includes(`${target}.value`)) return;

  const call = `${node.operator === "!==" ? "!" : ""}${helper(context, "equals")}(${target}, `;
  if (left) {
    out.update(node.start, other.start, call);
    out.appendLeft(node.end, ")");
  } else {
    out.prependRight(other.start, call);
    out.update(other.end, node.end, ")");
  }
  context.changed = true;
}

/**
 * Rewrites `items.map(fn)`, when `fn` returns JSX, to `map(items, fn)`, which
 * renders a keyed list when `items` is a state. Only apps that render such a
 * list ship the list code.
 */
function map(context: Context, node: Node) {
  const { callee, arguments: args } = node;
  const [fn] = args;

  if (
    node.optional ||
    args.length !== 1 ||
    callee.type !== "MemberExpression" ||
    callee.computed ||
    callee.optional ||
    callee.property.name !== "map" ||
    callee.object.type === "Super" ||
    !FUNCTIONS.has(fn.type) ||
    !has(fn.body, (n) => n.type === "JSXElement" || n.type === "JSXFragment")
  ) {
    return;
  }

  context.out.prependRight(callee.object.start, `${helper(context, "map")}(`);
  context.out.update(callee.object.end, fn.start, ", ");
  context.changed = true;
}

/**
 * Cleans JSX text like Babel: lines are trimmed, lines with only whitespace
 * are dropped, and the others are joined with a space.
 */
function clean(raw: string) {
  const lines = decode(raw).split(/\r\n|\n|\r/);
  let last = 0;
  lines.forEach((line, i) => /[^ \t]/.test(line) && (last = i));
  let text = "";

  lines.forEach((line, i) => {
    let trimmed = line.replace(/\t/g, " ");
    if (i) trimmed = trimmed.replace(/^[ ]+/, "");
    if (i < lines.length - 1) trimmed = trimmed.replace(/[ ]+$/, "");
    if (trimmed) text += i < last ? `${trimmed} ` : trimmed;
  });

  return text;
}

/** The static value of a JSX attribute: a string, `true`, `null` to omit it, or `undefined`. */
function staticValue(attribute: Node): string | true | null | undefined {
  const { value } = attribute;
  if (!value) return true;
  if (value.type === "Literal") return decode(value.value);
  if (value.type !== "JSXExpressionContainer") return undefined;

  const node = unwrap(value.expression);
  if (node.type === "Literal") {
    if (typeof node.value === "string") return node.value;
    if (typeof node.value === "number") return String(node.value);
    if (node.value === true) return true;
    if (node.value === false || node.value === null) return null;
  }
  if (node.type === "TemplateLiteral" && !node.expressions.length) {
    return node.quasis[0].value.cooked;
  }
  return undefined;
}

/** The static text of a JSX child expression, `""` for nothing, or `undefined`. */
function staticText(node: Node): string | undefined {
  node = unwrap(node);
  if (node.type === "Literal") {
    if (typeof node.value === "string") return node.value;
    if (typeof node.value === "number") return String(node.value);
    if (node.value === null || typeof node.value === "boolean") return "";
  }
  if (node.type === "TemplateLiteral" && !node.expressions.length) {
    return node.quasis[0].value.cooked;
  }
  return undefined;
}

/**
 * Compiles a host element tree into a clone of a template and the operations
 * that bind its dynamic parts, in source order.
 */
function template(
  context: Context,
  node: Node,
  tag: string,
  statements = false,
): Part[] {
  const operations: Operation[] = [];
  const svg = isSvg(tag);
  const root = element(context, node, tag, [], operations);
  const name = declare(context, html(root), svg && tag !== "svg");

  if (!operations.length) {
    return [statements ? `return ${name}(); ` : `${name}()`];
  }

  const comments: Slot[] = [];
  root.needed = true;
  for (const operation of operations) {
    operation.target.needed = true;
    if (operation.kind === "insert" && operation.marker) {
      operation.marker.needed = true;
      if (
        operation.marker.kind === "comment" &&
        !comments.includes(operation.marker)
      ) {
        comments.push(operation.marker);
      }
    }
  }

  root.ref = local(context, "el");
  const declarations = [`${root.ref} = ${name}()`];
  walk(context, root, declarations);

  const appends = new Map<Element, Operation[]>();
  for (const operation of operations) {
    if (operation.kind === "insert" && !operation.marker) {
      const list = appends.get(operation.target);
      if (list) list.push(operation);
      else appends.set(operation.target, [operation]);
    }
  }
  for (const [target, list] of appends) {
    if (list.length === 1 && target.children.length === 0)
      (list[0] as Extract<Operation, { kind: "insert" }>).text = true;
  }

  const parts: Part[] = statements
    ? [`const ${declarations.join(", ")}; `]
    : [`(() => { const ${declarations.join(", ")}; `];
  for (const operation of operations) parts.push(...render(context, operation));
  for (const comment of comments) parts.push(`${comment.ref}.remove(); `);
  parts.push(statements ? `return ${root.ref}; ` : `return ${root.ref}; })()`);
  return parts;
}

/** Declares a template once per module, and returns its name. */
function declare(context: Context, markup: string, svg: boolean) {
  const id = `${svg ? 1 : 0}${markup}`;
  let name = context.templates.get(id);
  if (!name) {
    name = local(context, "tmpl");
    context.templates.set(id, name);
    helper(context, "template");
  }
  return name;
}

/**
 * Builds the template of a host element: static attributes and children go
 * into it, the rest into `operations`. `ancestors` are the tags around it in
 * the template.
 */
function element(
  context: Context,
  node: Node,
  tag: string,
  ancestors: string[],
  operations: Operation[],
): Element {
  const self: Element = {
    kind: "element",
    tag,
    svg: isSvg(tag),
    attributes: "",
    children: [],
  };
  const attributes = (node.openingElement.attributes as Node[]).filter(
    (attribute) => !IGNORED.has(nameOf(attribute)),
  );
  const counts = new Map<string, number>();
  for (const attribute of attributes) {
    const name = resolve(nameOf(attribute));
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  for (const attribute of attributes) {
    const raw = nameOf(attribute);
    const name = resolve(raw);
    const value = attribute.value;

    if (
      raw.length > 2 &&
      raw.startsWith("on") &&
      value &&
      value.type !== "Literal"
    ) {
      const event = raw.slice(2).toLowerCase();
      if (DELEGATED.has(event)) context.events.add(event);
      operations.push({
        kind: "event",
        target: self,
        name: event,
        value: attributeValue(context, attribute, false),
      });
      continue;
    }

    const fixed = staticValue(attribute);
    if (
      fixed !== undefined &&
      (!PROPERTIES.has(name) || (tag === "option" && name === "value")) &&
      counts.get(name) === 1 &&
      !(self.svg && /[A-Z]/.test(name) && !SVG_CAMEL.has(name)) &&
      !(typeof fixed === "string" && /[\r\0]/.test(fixed))
    ) {
      if (fixed !== null) {
        self.attributes +=
          fixed === true ? ` ${name}` : ` ${name}="${escape(fixed, true)}"`;
      }
    } else {
      const cond =
        name === "class" && counts.get(name) === 1
          ? conditional(context, attribute)
          : null;

      if (cond) {
        operations.push({ kind: "cond", target: self, ...cond });
      } else {
        operations.push({
          kind: "attr",
          target: self,
          name,
          value: attributeValue(context, attribute, true),
        });
      }
    }
  }

  const opaque = !self.svg && (OPAQUE.has(tag) || VOID.has(tag));
  const inner = self.svg && tag !== "foreignObject";
  const path = [...ancestors, tag];
  let pending: (Operation & { kind: "insert" })[] = [];
  let text = "";

  function place(slot: Slot) {
    const last = self.children[self.children.length - 1];
    if (pending.length && slot.kind === "text" && last?.kind === "text") {
      place({ kind: "comment", text: "" });
    }
    for (const operation of pending) operation.marker = slot;
    pending = [];
    self.children.push(slot);
  }

  function flush() {
    if (!text) return;
    const first = !self.children.length && !pending.length;
    if (
      opaque ||
      TABLES.has(tag) ||
      /[\r\0]/.test(text) ||
      (first && (tag === "pre" || tag === "listing") && text.startsWith("\n"))
    ) {
      insert([quote(text)]);
    } else {
      place({ kind: "text", text });
    }
    text = "";
  }

  function insert(value: Part[]) {
    const operation = { kind: "insert" as const, target: self, value };
    operations.push(operation);
    pending.push(operation);
  }

  function add(children: Node[]) {
    for (const child of children) {
      if (child.type === "JSXText") {
        text += clean(child.value);
      } else if (child.type === "JSXExpressionContainer") {
        const { expression: value } = child;
        if (value.type === "JSXEmptyExpression") continue;
        const fixed = staticText(value);
        if (fixed !== undefined) {
          text += fixed;
          continue;
        }
        flush();
        insert(expression(value, true));
      } else if (child.type === "JSXSpreadChild") {
        flush();
        insert(["[...", { node: child.expression, thunk: false }, "]"]);
      } else if (child.type === "JSXFragment") {
        add(child.children);
      } else {
        flush();
        const name = tagOf(context, child.openingElement.name);
        if (
          !name.component &&
          !opaque &&
          !fallback(child, name.host) &&
          nests(name.host, inner, path)
        ) {
          place(element(context, child, name.host, path, operations));
        } else {
          insert(jsx(context, child));
        }
      }
    }
  }

  add(node.children);
  flush();
  return self;
}

function resolve(name: string) {
  return ALIASES[name] ?? name;
}

/**
 * Whether the HTML parser, reading `child` inside the elements of `path`,
 * would create it there, in the namespace the runtime creates it in. When it
 * wouldn't, the child gets a template of its own.
 */
function nests(child: string, svg: boolean, path: string[]) {
  const parent = path[path.length - 1];
  const childSvg = isSvg(child);

  if (svg ? !childSvg : childSvg && child !== "svg") return false;
  if (parent === "foreignObject") return false;
  if (childSvg) return true;
  if (ALLOWED[parent] && !ALLOWED[parent].includes(child)) return false;
  if (PARENTS[child] && !PARENTS[child].includes(parent)) return false;
  if (HEADINGS.has(child) && HEADINGS.has(parent)) return false;
  if (["a", "button", "form"].includes(child) && path.includes(child))
    return false;
  if (child === "li" && open(path, ["li"], ["ol", "ul", "menu"])) return false;
  if ((child === "dd" || child === "dt") && open(path, ["dd", "dt"], ["dl"])) {
    return false;
  }
  if (CLOSES_P.has(child) && open(path, ["p"], [...SCOPES])) return false;
  return true;
}

/** Whether one of `tags` is open in `path`, looking up to one of `stops`. */
function open(path: string[], tags: string[], stops: string[]) {
  for (let i = path.length - 1; i >= 0; i--) {
    if (tags.includes(path[i])) return true;
    if (stops.includes(path[i])) return false;
  }
  return false;
}

function escape(text: string, attribute?: boolean) {
  return attribute
    ? text.replace(/&/g, "&amp;").replace(/"/g, "&quot;")
    : text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Serializes a template element. */
function html(slot: Slot): string {
  if (slot.kind !== "element") {
    return slot.kind === "text" ? escape(slot.text) : "<!>";
  }
  const inner = slot.children.map(html).join("");
  const close = !slot.svg && VOID.has(slot.tag) ? "" : `</${slot.tag}>`;
  return `<${slot.tag}${slot.attributes}>${inner}${close}`;
}

/**
 * Declares a variable for each node an operation needs, and for the nodes on
 * the way to them, walking with `firstChild` and `nextSibling`.
 */
function walk(context: Context, parent: Element, declarations: string[]) {
  let previous = "";
  let distance = 0;

  parent.children.forEach((child, i) => {
    distance++;
    if (!needs(child)) return;

    child.ref ??= local(context, "el");
    const path = previous
      ? previous + ".nextSibling".repeat(distance)
      : `${parent.ref}.firstChild` + ".nextSibling".repeat(i);
    declarations.push(`${child.ref} = ${path}`);
    previous = child.ref;
    distance = 0;
    if (child.kind === "element") walk(context, child, declarations);
  });
}

function needs(slot: Slot): boolean {
  return (
    !!slot.needed || (slot.kind === "element" && slot.children.some(needs))
  );
}

function render(context: Context, operation: Operation): Part[] {
  const target = operation.target.ref!;

  if (operation.kind === "insert") {
    const marker = operation.marker ? `, ${operation.marker.ref}` : "";
    const name = operation.text ? "text" : "insert";
    return [
      `${helper(context, name)}(${target}, `,
      ...operation.value,
      `${marker}); `,
    ];
  }
  if (operation.kind === "attr") {
    return [
      `${helper(context, "attr")}(${target}, ${quote(operation.name)}, `,
      ...operation.value,
      "); ",
    ];
  }
  if (operation.kind === "cond") {
    return [
      `${helper(context, "classIf")}(${target}, `,
      ...operation.state,
      ", ",
      ...operation.key,
      `, ${quote(operation.yes)}, ${quote(operation.no)}); `,
    ];
  }
  if (DELEGATED.has(operation.name)) {
    return [`${target}.$$${operation.name} = `, ...operation.value, "; "];
  }
  return [
    `${target}.addEventListener(${quote(operation.name)}, `,
    ...operation.value,
    "); ",
  ];
}

/**
 * Adds the imports of the helpers used, the templates and the delegated
 * events at the top of the module, after its directives.
 */
function prepend(context: Context, program: Node) {
  const lines: string[] = [];
  const internal: string[] = [];
  if (context.events.size) helper(context, "delegate");

  for (const [name, local] of context.helpers) {
    if (name === "h")
      lines.push(`import { createElement as ${local} } from "qwrk";`);
    else if (name === "svg")
      lines.push(`import { svg as ${local} } from "qwrk";`);
    else internal.push(`${name} as ${local}`);
  }
  if (internal.length) {
    lines.push(`import { ${internal.join(", ")} } from "qwrk/internal";`);
  }
  for (const [id, name] of context.templates) {
    const svg = id[0] === "1" ? ", true" : "";
    lines.push(
      `const ${name} = /*#__PURE__*/ ${helper(context, "template")}(${quote(id.slice(1))}${svg});`,
    );
  }
  if (context.events.size) {
    lines.push(
      `${helper(context, "delegate")}(${JSON.stringify([...context.events])});`,
    );
  }

  const directives = (program.body as Node[]).filter(
    (statement) => statement.directive,
  );
  const header = lines.join("\n");
  if (directives.length) {
    context.out.appendLeft(
      directives[directives.length - 1].end,
      `\n${header}`,
    );
  } else if (program.hashbang) {
    context.out.appendLeft(program.hashbang.end, `\n${header}`);
  } else {
    context.out.prepend(`${header}\n`);
  }
}

/**
 * A JavaScript string literal of `text`, ASCII only, so it survives a page
 * served without a charset.
 */
function quote(text: string) {
  return JSON.stringify(text).replace(
    /[\u007f-￿]/g,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}
