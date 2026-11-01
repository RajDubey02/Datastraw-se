// Verdant & Co - Sole Source of Truth Knowledge Base
export const VERDANT_KNOWLEDGE_BASE = [
  {
    topic: "Shipping",
    policy: "Orders ship within 24 hours, Monday to Saturday. Delivery takes 3-5 business days in metro cities and 5-8 business days elsewhere in India. We only deliver within India."
  },
  {
    topic: "Address change",
    policy: "The delivery address can be changed only before the order has shipped, and only if the customer contacts us within 12 hours of placing it. After shipping, the address cannot be changed."
  },
  {
    topic: "Cancellation",
    policy: "An order can be cancelled before it ships. After it ships, the customer can refuse delivery and a refund is issued once the parcel returns to us."
  },
  {
    topic: "Returns",
    policy: "Returns are accepted within 7 days of delivery for unopened, unused products. Opened products are accepted only if damaged or if the wrong item was sent."
  },
  {
    topic: "Refunds",
    policy: "Approved refunds go back to the original payment method within 5-7 business days after we receive the returned parcel."
  },
  {
    topic: "Cash on delivery",
    policy: "Cash on delivery is available for orders under ₹3,000, with a ₹50 fee."
  },
  {
    topic: "Ingredients",
    policy: "All Verdant & Co products are fragrance-free and vegan."
  }
];

export const KNOWLEDGE_BASE_TEXT = VERDANT_KNOWLEDGE_BASE.map(
  (item) => `[Topic: ${item.topic}]\n${item.policy}`
).join("\n\n");
