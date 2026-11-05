import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { formatDate, formatPeso } from "@/lib/utils";
import { getBalance } from "@/modules/cashier/balance";
import { recordCashPayment, startOnlinePayment } from "@/modules/cashier/payments";

async function payCash(formData: FormData) {
  "use server";
  const user = await requireRole("CASHIER", "ADMIN");
  const enrollmentId = String(formData.get("enrollmentId"));
  try {
    const p = await recordCashPayment(Object.fromEntries(formData) as never, user.id);
    redirect(`/cashier/payments/${p.id}`);
  } catch (e) {
    if ((e as Error).message === "NEXT_REDIRECT" || (e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    redirect(`/cashier/enrollments/${enrollmentId}?error=${encodeURIComponent((e as Error).message)}`);
  }
}

async function payOnline(formData: FormData) {
  "use server";
  const user = await requireRole("CASHIER", "ADMIN");
  const enrollmentId = String(formData.get("enrollmentId"));
  try {
    const p = await startOnlinePayment(Object.fromEntries(formData) as never, user.id);
    redirect(p.checkoutUrl!); // hosted GCash / Maya checkout page
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    redirect(`/cashier/enrollments/${enrollmentId}?error=${encodeURIComponent((e as Error).message)}`);
  }
}

export default async function EnrollmentPayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const enrollment = await db.enrollment.findUnique({
    where: { id },
    include: {
      student: true,
      gradeLevel: true,
      charges: true,
      payments: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!enrollment) notFound();
  const bal = await getBalance(id);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>
            {enrollment.student.lastName}, {enrollment.student.firstName}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {enrollment.gradeLevel.name} • {enrollment.student.studentNo}
          </p>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ul>
            {enrollment.charges.map((c) => (
              <li key={c.id} className="flex justify-between">
                <span>{c.description}</span>
                <span>{formatPeso(c.amount)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t pt-2">
            <div className="flex justify-between"><span>Paid</span><span>{formatPeso(bal.paid)}</span></div>
            <div className="flex justify-between font-semibold"><span>Balance</span><span>{formatPeso(bal.balance)}</span></div>
          </div>
          <h4 className="pt-2 font-medium">History</h4>
          <ul className="space-y-1">
            {enrollment.payments.map((p) => (
              <li key={p.id} className="flex justify-between">
                <span>{formatDate(p.createdAt)} • {p.method} • {p.status}</span>
                <span>{formatPeso(p.amount)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}

        <Card>
          <CardHeader><CardTitle>Cash</CardTitle></CardHeader>
          <CardContent>
            <form action={payCash} className="space-y-3">
              <input type="hidden" name="enrollmentId" value={id} />
              <div className="space-y-1.5"><Label>Amount due</Label>
                <Input name="amount" type="number" step="0.01" min="1" required /></div>
              <div className="space-y-1.5"><Label>Amount tendered</Label>
                <Input name="amountTendered" type="number" step="0.01" min="1" required /></div>
              <Button type="submit">Receive cash &amp; issue receipt</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>GCash / Maya</CardTitle></CardHeader>
          <CardContent>
            <form action={payOnline} className="space-y-3">
              <input type="hidden" name="enrollmentId" value={id} />
              <div className="space-y-1.5"><Label>Amount</Label>
                <Input name="amount" type="number" step="0.01" min="100" required /></div>
              <select name="method" className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                <option value="GCASH">GCash</option>
                <option value="MAYA">Maya</option>
              </select>
              <Button type="submit" variant="outline">Open online checkout</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
