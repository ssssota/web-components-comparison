import { defineCustomElement } from "vue";
import FeedCard from "./FeedCard.ce.vue";

export const VueFeedCard = defineCustomElement(FeedCard);

customElements.define("vue-feed-card", VueFeedCard);
