import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  cashPaymentSchema,
  onlinePaymentSchema,
  voidPaymentSchema,
} from "@/lib/validation";
import { getBalance, syncEnrollmentStatus } from "./balance";
import { createCheckout } from "./providers/paymongo";

async function nextReceiptNo(tx: Prisma.TransactionClient) {
  const year = new Date().getFullYear();
  const c = await tx.receiptCounter.upsert({
    where: { year },
    update: { last: { increment: 1 } },
    create: { year, last: 1 },
  });
  return `OR-${year}-${String(c.last).padStart(6, "0")}`;
}

/** Marks a payment PAID and issues its receipt number. Idempotent. */
export async function markPaid(
  paymentId: string,
  opts: { receivedById?: string } = {},
) {
  return db.$transaction(async (tx) => {
    const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
    if (payment.status === "PAID") return payment; // webhook retries are safe

    const updated = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: "PAID",
        paidAt: new Date(),
        receiptNo: await nextReceiptNo(tx),
        receivedById: opts.receivedById ?? payment.receivedById,
      },
    });
    await syncEnrollmentStatus(payment.enrollmentId, tx);
    return updated;
  });
}

export async function recordCashPayment(
  input: z.infer<typeof cashPaymentSchema>,
  cashierId: string,
) {
  const data = cashPaymentSchema.parse(input);
  if (data.amountTendered < data.amount) {
    throw new Error("Amount tendered is less than the amount due.");
  }
  const { balance } = await getBalance(data.enrollmentId);
  if (new Prisma.Decimal(data.amount).gt(balance)) {
    throw new Error("Payment exceeds the outstanding balance.");
  }

  const payment = await db.payment.create({
    data: {
      enrollmentId: data.enrollmentId,
      amount: data.amount,
      amountTendered: data.amountTendered,
      method: "CASH",
      receivedById: cashierId,
    },
  });
  return markPaid(payment.id, { receivedById: cashierId });
}

/** Creates a pending payment and a hosted GCash / Maya checkout page. */
export async function startOnlinePayment(
  input: z.infer<typeof onlinePaymentSchema>,
  cashierId?: string,
) {
  const data = onlinePaymentSchema.parse(input);
  const { balance } = await getBalance(data.enrollmentId);
  if (new Prisma.Decimal(data.amount).gt(balance)) {
    throw new Error("Payment exceeds the outstanding balance.");
  }

  const enrollment = await db.enrollment.findUniqueOrThrow({
    where: { id: data.enrollmentId },
    include: { student: true },
  });

  const payment = await db.payment.create({
    data: {
      enrollmentId: data.enrollmentId,
      amount: data.amount,
      method: data.method,
      receivedById: cashierId,
    },
  });

  const checkout = await createCheckout({
    paymentId: payment.id,
    amount: data.amount,
    method: data.method,
    description: `School fees – ${enrollment.student.lastName}, ${enrollment.student.firstName} (${enrollment.student.studentNo})`,
  });

  return db.payment.update({
    where: { id: payment.id },
    data: { providerRef: checkout.id, checkoutUrl: checkout.url },
  });
}

export async function voidPayment(
  input: z.infer<typeof voidPaymentSchema>,
  adminId: string,
) {
  const data = voidPaymentSchema.parse(input);
  return db.$transaction(async (tx) => {
    const payment = await tx.payment.findUniqueOrThrow({
      where: { id: data.paymentId },
    });
    if (payment.status !== "PAID") throw new Error("Only paid payments can be voided.");

    const updated = await tx.payment.update({
      where: { id: payment.id },
      data: { status: "VOIDED", voidReason: data.reason },
    });
    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: "PAYMENT_VOIDED",
        entity: "Payment",
        entityId: payment.id,
        details: { reason: data.reason, receiptNo: payment.receiptNo },
      },
    });
    await syncEnrollmentStatus(payment.enrollmentId, tx);
    return updated;
  });
}
