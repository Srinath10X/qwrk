import type { State } from "#qwrk/reactivity/state.js";

/** A plain value, or a state that keeps the attribute in sync. */
type Reactive<T> = T | State<T>;

/**
 * Multi-word events, spelled like React (`onKeyDown`). Events not listed here
 * are capitalized: `click` becomes `onClick`. Any casing works at runtime.
 */
interface EventNames {
  animationend: "AnimationEnd";
  animationstart: "AnimationStart";
  beforeinput: "BeforeInput";
  contextmenu: "ContextMenu";
  dblclick: "DblClick";
  dragend: "DragEnd";
  dragenter: "DragEnter";
  dragleave: "DragLeave";
  dragover: "DragOver";
  dragstart: "DragStart";
  focusin: "FocusIn";
  focusout: "FocusOut";
  keydown: "KeyDown";
  keypress: "KeyPress";
  keyup: "KeyUp";
  mousedown: "MouseDown";
  mouseenter: "MouseEnter";
  mouseleave: "MouseLeave";
  mousemove: "MouseMove";
  mouseout: "MouseOut";
  mouseover: "MouseOver";
  mouseup: "MouseUp";
  pointercancel: "PointerCancel";
  pointerdown: "PointerDown";
  pointerenter: "PointerEnter";
  pointerleave: "PointerLeave";
  pointermove: "PointerMove";
  pointerout: "PointerOut";
  pointerover: "PointerOver";
  pointerup: "PointerUp";
  touchcancel: "TouchCancel";
  touchend: "TouchEnd";
  touchmove: "TouchMove";
  touchstart: "TouchStart";
  transitionend: "TransitionEnd";
}

type EventMap = GlobalEventHandlersEventMap;

type EventProps<E> = {
  [
    K in keyof EventMap as `on${K extends keyof EventNames
      ? EventNames[K]
      : Capitalize<K>}`
  ]?: (event: EventMap[K] & { currentTarget: E }) => void;
};

/** Properties that exist on elements but aren't attributes. */
type NotAttributes =
  | "innerHTML"
  | "outerHTML"
  | "innerText"
  | "outerText"
  | "textContent"
  | "nodeValue"
  | "scrollTop"
  | "scrollLeft";

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

/** Whether `T[K]` can be assigned, e.g. `id` yes, `tagName` no. */
type IsWritable<T, K extends keyof T> = Equals<
  Pick<T, K>,
  { -readonly [P in K]: T[P] }
>;

/** The element's writable text, number and boolean properties: `id`, `href`, `disabled`... */
type AttributeProps<E> = {
  [
    K in Exclude<keyof E, NotAttributes> as K extends `on${string}`
      ? never
      : E[K] extends string | number | boolean
        ? IsWritable<E, K> extends true
          ? K
          : never
        : never
  ]?: Reactive<E[K] | null | undefined>;
};

/** `style={{ backgroundColor: "red", "--gap": "4px" }}` */
type StyleObject = {
  [
    K in keyof CSSStyleDeclaration as K extends string
      ? CSSStyleDeclaration[K] extends string
        ? K
        : never
      : never
  ]?: string | number | null;
} & { [property: `--${string}`]: string | number | null };

type Style = Reactive<string | StyleObject | null | undefined>;

/** Props of an HTML element in JSX. */
export type HTMLProps<E> = AttributeProps<E> &
  EventProps<E> & {
    class?: Reactive<string | null | undefined>;
    style?: Style;
    children?: unknown;
  };

/**
 * Props of an SVG element in JSX. SVG attributes (`viewBox`, `d`, `fill`...)
 * aren't listed, so any attribute is accepted.
 */
export type SVGProps<E> = EventProps<E> & {
  style?: Style;
  children?: unknown;
  [attribute: string]: unknown;
};

type SVGOnlyTags = Exclude<
  keyof SVGElementTagNameMap,
  keyof HTMLElementTagNameMap
>;

export type IntrinsicElements = {
  [K in keyof HTMLElementTagNameMap]: HTMLProps<HTMLElementTagNameMap[K]>;
} & {
  [K in SVGOnlyTags]: SVGProps<SVGElementTagNameMap[K]>;
};
