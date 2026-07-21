/**
 * Snipcart -> Printful order fulfillment bridge.
 *
 * Snipcart calls this on the "order.completed" webhook event. We verify the
 * webhook, pull the full order from Snipcart's API, translate line items to
 * Printful catalog variants via SKU_TO_PRINTFUL_VARIANT, and submit the order
 * to Printful so it ships automatically - replacing what the WooCommerce
 * Printful plugin used to do.
 *
 * Required Worker secrets (set via `wrangler secret put`):
 *   SNIPCART_API_KEY   - Snipcart secret API key (order lookups + webhook auth)
 *   PRINTFUL_API_KEY   - Printful API token for her store
 */
import SKU_TO_PRINTFUL_VARIANT from "../sku-to-printful-variant.json";

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const event = await request.json();

    if (!(await isValidSnipcartRequest(request, env))) {
      return new Response("Unauthorized", { status: 401 });
    }

    if (event.eventName !== "order.completed") {
      // Acknowledge anything else (order.status.changed, etc.) without action.
      return new Response("Ignored", { status: 200 });
    }

    const order = event.content;

    try {
      await submitToPrintful(order, env);
    } catch (err) {
      console.error("Printful submission failed", err);
      // Return 200 anyway so Snipcart doesn't retry indefinitely on a
      // permanent error (e.g. missing SKU mapping) - failures need a human.
      // TODO: replace with a real alert (email/Slack webhook) once decided.
      return new Response("Logged failure: " + err.message, { status: 200 });
    }

    return new Response("OK", { status: 200 });
  },
};

async function isValidSnipcartRequest(request, env) {
  // Snipcart signs webhooks with HMAC-SHA256 of the raw body, header
  // "X-Snipcart-RequestToken" carries the token to verify against the
  // secret key. See: https://docs.snipcart.com/v3/webhooks/introduction
  const token = request.headers.get("x-snipcart-requesttoken");
  if (!token) return false;

  const verifyRes = await fetch(
    `https://app.snipcart.com/api/requestvalidation/${token}`,
    { headers: { Authorization: "Basic " + btoa(env.SNIPCART_API_KEY + ":") } }
  );
  return verifyRes.ok;
}

async function submitToPrintful(order, env) {
  const recipient = {
    name: `${order.shippingAddress.name}`,
    address1: order.shippingAddress.address1,
    address2: order.shippingAddress.address2 || "",
    city: order.shippingAddress.city,
    state_code: order.shippingAddress.province,
    country_code: order.shippingAddress.country,
    zip: order.shippingAddress.postalCode,
    email: order.email,
    phone: order.shippingAddress.phone || "",
  };

  const items = [];
  const unmapped = [];

  for (const item of order.items) {
    const mapping = SKU_TO_PRINTFUL_VARIANT[item.id];
    if (!mapping || !mapping.printful_variant_id) {
      unmapped.push(item.id);
      continue;
    }
    items.push({
      variant_id: mapping.printful_variant_id,
      quantity: item.quantity,
      retail_price: item.price.toFixed(2),
    });
  }

  if (unmapped.length > 0) {
    throw new Error(
      `No Printful variant mapped for SKU(s): ${unmapped.join(", ")}. ` +
      `Update worker/sku-to-printful-variant.json.`
    );
  }

  const res = await fetch("https://api.printful.com/orders", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.PRINTFUL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      external_id: order.token,
      recipient,
      items,
      retail_costs: {
        currency: order.currency.toUpperCase(),
        subtotal: order.subtotal.toFixed(2),
        shipping: order.shippingFees.toFixed(2),
        total: order.total.toFixed(2),
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Printful API error ${res.status}: ${body}`);
  }
}
