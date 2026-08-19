declare module "preact-custom-element" {
  import type { ComponentType } from "preact";

  export default function register(
    component: ComponentType<Record<string, unknown>>,
    tagName: string,
    observedAttributes?: string[],
    options?: {
      shadow?: boolean;
      mode?: ShadowRootMode;
      adoptedStyleSheets?: CSSStyleSheet[];
      serializable?: boolean;
    },
  ): void;
}
