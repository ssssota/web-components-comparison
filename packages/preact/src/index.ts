import register from "preact-custom-element";
import { FeedCard } from "./feed-card.tsx";
import cssText from "./styles.css?inline";

const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);

register(FeedCard, "preact-feed-card", ["post-id"], {
  shadow: true,
  mode: "open",
  adoptedStyleSheets: [sheet],
});
