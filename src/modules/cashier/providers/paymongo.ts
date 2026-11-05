import crypto from "node:crypto";

/**
 * PayMongo adapter (GCash + Maya through hosted Checkout Sessions).
 * Verify endpoint shapes and signature format against the current PayMongo
 * docs before going live: https://developers.paymongo.com
 */

const API = "https://api.paymongo.com/v1";

function authHeader() {
  const key = process.env.PAYMONGO_SECRET_KEY;
  if (!key) throw new Error("PAYMONGO_SECRET_KEY is not set.");
  return "Basic " + Buffer.from(`${key}:`).toString("base64");
}

export async function createCheckout(opts: {
  paymentId: string;
  amount: number; // pesos
  method: "GCASH" | "MAYA";
  description: string;
}) {
  const base = process.env.APP_BASE_URL ?? "http://localhost:3000";

  const res = await fetch(`${API}/checkout_sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({
      data: {
        attributes: {
          line_items: [
            {
              currency: "PHP",
              amount: Math.round(opts.amount * 100), // centavos
              name: "School fees",
              quantity: 1,
            },
          ],
          payment_method_types: [opts.method === "GCASH" ? "gcash" : "paymaya"],
          description: opts.description,
          reference_number: opts.paymentId,
          metadata: { paymentId: opts.paymentId },
          success_url: `${base}/cashier/payments/${opts.paymentId}?status=success`,
          cancel_url: `${base}/cashier/payments/${opts.paymentId}?status=cancelled`,
        },
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`PayMongo error ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  return {
    id: json.data.id as string,
    url: json.data.attributes.checkout_url as string,
  };
}

/** Verifies the `Paymongo-Signature` header: "t=<ts>,te=<test sig>,li=<live sig>". */
export function verifyWebhook(rawBody: string, header: string | null) {
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!secret || !header) return false;

  const parts = Object.fromEntries(
    header.split(",").map((p) => p.split("=") as [string, string]),
  );
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${parts.t}.${rawBody}`)
    .digest("hex");

  const provided = parts.li || parts.te;
  if (!provided || provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}
