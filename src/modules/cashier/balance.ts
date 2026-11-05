import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

type Client = Prisma.TransactionClient | typeof db;

/** Total charged, total paid (PAID only) and balance for an enrollment. */
export async function getBalance(enrollmentId: string, client: Client = db) {
  const [charges, payments] = await Promise.all([
    client.charge.aggregate({ where: { enrollmentId }, _sum: { amount: true } }),
    client.payment.aggregate({
      where: { enrollmentId, status: "PAID" },
      _sum: { amount: true },
    }),
  ]);
  const charged = charges._sum.amount ?? new Prisma.Decimal(0);
  const paid = payments._sum.amount ?? new Prisma.Decimal(0);
  return { charged, paid, balance: charged.minus(paid) };
}

/**
 * After any payment change: an enrollment becomes ENROLLED once at least
 * one payment is posted, and drops back to PENDING if all payments are voided.
 * Adjust this rule to match the school's policy (e.g. require full downpayment).
 */
export async function syncEnrollmentStatus(
  enrollmentId: string,
  client: Client = db,
) {
  const { paid } = await getBalance(enrollmentId, client);
  const enrollment = await client.enrollment.findUniqueOrThrow({
    where: { id: enrollmentId },
  });
  if (enrollment.status === "DROPPED" || enrollment.status === "CANCELLED") return;

  const next = paid.gt(0) ? "ENROLLED" : "PENDING";
  if (next !== enrollment.status) {
    await client.enrollment.update({
      where: { id: enrollmentId },
      data: { status: next },
    });
  }
}
