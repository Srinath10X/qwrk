/** An SVG file is a component rendering it inline; with `?url` it is a URL. */
declare module "*.svg" {
  const Component: (props?: Record<string, string | number>) => SVGSVGElement;
  export default Component;
}

declare module "*.svg?url" {
  const url: string;
  export default url;
}

declare module "*.css";
