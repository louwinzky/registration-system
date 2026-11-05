import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate, formatPeso } from "@/lib/utils";

export default async function PaymentsPage() {
  const payments = await db.payment.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { enrollment: { include: { student: true } } },
  });

  return (
    <table className="w-full text-sm">
      <thead className="border-b text-left text-muted-foreground">
        <tr>
          <th className="py-2">Date</th><th>Receipt</th><th>Student</th>
          <th>Method</th><th>Status</th><th className="text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        {payments.map((p) => (
          <tr key={p.id} className="border-b">
            <td className="py-2">{formatDate(p.createdAt)}</td>
            <td className="font-mono">{p.receiptNo ?? "—"}</td>
            <td>{p.enrollment.student.lastName}, {p.enrollment.student.firstName}</td>
            <td>{p.method}</td>
            <td>{p.status}</td>
            <td className="text-right">
              <Link className="text-primary underline" href={`/cashier/payments/${p.id}`}>
                {formatPeso(p.amount)}
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
