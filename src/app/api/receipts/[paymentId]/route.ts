import { auth } from "@/auth";
import { buildReceiptPdf } from "@/modules/cashier/receipt-pdf";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const session = await auth();
  if (!session?.user || !["CASHIER", "ADMIN", "REGISTRAR"].includes(session.user.role)) {
    return new Response("Forbidden", { status: 403 });
  }

  const { paymentId } = await params;
  try {
    const pdf = await buildReceiptPdf(paymentId);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="receipt-${paymentId}.pdf"`,
      },
    });
  } catch (e) {
    return new Response((e as Error).message, { status: 404 });
  }
}
