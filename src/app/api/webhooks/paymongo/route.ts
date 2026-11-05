import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { markPaid } from "@/modules/cashier/payments";
import { verifyWebhook } from "@/modules/cashier/providers/paymongo";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // Signature must be checked against the raw, unparsed body.
  const raw = await req.text();
  if (!verifyWebhook(raw, req.headers.get("paymongo-signature"))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(raw);
  const type: string = event?.data?.attributes?.type;

  if (type === "checkout_session.payment.paid") {
    const checkoutId: string | undefined =
      event.data.attributes.data?.id;
    if (checkoutId) {
      const payment = await db.payment.findUnique({
        where: { providerRef: checkoutId },
      });
      if (payment) await markPaid(payment.id);
    }
  }

  // Always 200 for verified events so the provider stops retrying.
  return NextResponse.json({ received: true });
}
