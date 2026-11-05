import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatPeso } from "@/lib/utils";

export default async function PaymentDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = await db.payment.findUnique({
    where: { id },
    include: { enrollment: { include: { student: true } } },
  });
  if (!p) notFound();

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>
          {p.status === "PAID" ? "Payment received" : `Payment ${p.status.toLowerCase()}`}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>{p.enrollment.student.lastName}, {p.enrollment.student.firstName}</p>
        <p>{p.method} • {formatPeso(p.amount)}</p>
        {p.receiptNo && <p className="font-mono">{p.receiptNo}</p>}

        {p.status === "PAID" && (
          <a className="text-primary underline" href={`/api/receipts/${p.id}`} target="_blank">
            Open receipt (PDF)
          </a>
        )}
        {p.status === "PENDING" && p.method !== "CASH" && (
          <p className="text-muted-foreground">
            Waiting for GCash/Maya confirmation. Refresh this page in a moment.
          </p>
        )}
        <Link className="block pt-2 text-primary underline" href={`/cashier/enrollments/${p.enrollmentId}`}>
          Back to student account
        </Link>
      </CardContent>
    </Card>
  );
}
