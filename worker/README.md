# Snipcart → Printful order bridge

Replaces the WooCommerce Printful plugin: when a Snipcart order completes,
this Worker submits it to Printful for production and shipping.

## Setup (once accounts exist)

1. `npm install -g wrangler` (Cloudflare's CLI), then `wrangler login`.
2. From this `worker/` directory: `wrangler deploy`.
3. Set secrets:
   ```
   wrangler secret put SNIPCART_API_KEY   # Snipcart Dashboard > API keys > Secret key
   wrangler secret put PRINTFUL_API_KEY   # Printful Dashboard > Settings > API
   ```
4. In the Snipcart Dashboard, add a webhook pointing at the deployed Worker
   URL, subscribed to the `order.completed` event.

## Required: SKU → Printful variant mapping

`sku-to-printful-variant.json` lists all 116 SKUs from the product catalog
(one per wall art size, one per simple product) with `printful_variant_id`
set to `null`. Each one needs the matching Printful catalog variant ID
before an order containing that SKU can be submitted - until then, the
Worker logs which SKUs are missing and returns without submitting (see the
TODO in `src/index.js` for wiring up a real alert instead of just a log).

Fastest way to fill this in: once the Printful API key is available, fetch
her store's synced products (`GET https://api.printful.com/store/products`)
and match them to this list by name - much faster than looking each one up
by hand in the Printful dashboard. Ask for this to be done as a follow-up
once the key is available.
