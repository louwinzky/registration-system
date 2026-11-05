import { revalidatePath } from "next/cache";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { formatDate, formatPeso } from "@/lib/utils";
import { voidPayment } from "@/modules/cashier/payments";

async function voidAction(formData: FormData) {
  "use server";
  const admin = await requireRole("ADMIN");
  await voidPayment(
    { paymentId: String(formData.get("paymentId")), reason: String(formData.get("reason")) },
    admin.id,
  );
  revalidatePath("/admin/payments");
}

export default async function AdminPayments() {
  const payments = await db.payment.findMany({
    where: { status: "PAID" },
    orderBy: { paidAt: "desc" },
    take: 50,
    include: { enrollment: { include: { student: true } } },
  });

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Voiding is audited and recomputes the student’s balance and enrollment status.
      </p>
      {payments.map((p) => (
        <form key={p.id} action={voidAction} className="flex items-center gap-3 border-b py-2 text-sm">
          <input type="hidden" name="paymentId" value={p.id} />
          <span className="w-28">{p.paidAt ? formatDate(p.paidAt) : ""}</span>
          <span className="w-36 font-mono">{p.receiptNo}</span>
          <span className="flex-1">{p.enrollment.student.lastName}, {p.enrollment.student.firstName}</span>
          <span className="w-28 text-right">{formatPeso(p.amount)}</span>
          <Input name="reason" placeholder="Reason" required minLength={5} className="w-56" />
          <Button variant="destructive" size="sm">Void</Button>
        </form>
      ))}
    </div>
  );
}
