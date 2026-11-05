import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/db";
import { formatPeso } from "@/lib/utils";
import { getBalance } from "@/modules/cashier/balance";

export default async function CashierHome({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const term = q.trim();

  const enrollments = term
    ? await db.enrollment.findMany({
        where: {
          schoolYear: { isCurrent: true },
          status: { in: ["PENDING", "ENROLLED"] },
          student: {
            OR: [
              { lastName: { contains: term, mode: "insensitive" } },
              { firstName: { contains: term, mode: "insensitive" } },
              { studentNo: { contains: term } },
            ],
          },
        },
        include: { student: true, gradeLevel: true },
        take: 20,
      })
    : [];

  const rows = await Promise.all(
    enrollments.map(async (e) => ({ e, bal: await getBalance(e.id) })),
  );

  return (
    <div className="space-y-4">
      <form className="flex gap-2">
        <Input name="q" defaultValue={q} placeholder="Search student name or number" autoFocus />
        <Button type="submit">Find</Button>
      </form>

      <table className="w-full text-sm">
        <thead className="border-b text-left text-muted-foreground">
          <tr>
            <th className="py-2">Student</th>
            <th>Level</th>
            <th>Status</th>
            <th className="text-right">Balance</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map(({ e, bal }) => (
            <tr key={e.id} className="border-b">
              <td className="py-2">
                {e.student.lastName}, {e.student.firstName}
                <span className="ml-2 font-mono text-xs text-muted-foreground">{e.student.studentNo}</span>
              </td>
              <td>{e.gradeLevel.name}</td>
              <td>{e.status}</td>
              <td className="text-right">{formatPeso(bal.balance)}</td>
              <td className="text-right">
                <Link className="text-primary underline" href={`/cashier/enrollments/${e.id}`}>
                  Collect
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
