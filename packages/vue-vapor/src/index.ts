import { defineVaporCustomElement } from "vue";
import FeedCard from "./FeedCard.ce.vue";

export const VueVaporFeedCard = defineVaporCustomElement(FeedCard);

customElements.define("vue-vapor-feed-card", VueVaporFeedCard);
