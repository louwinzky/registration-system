import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/db";
import { searchStudents } from "@/modules/registrar/service";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const students = q
    ? await searchStudents(q)
    : await db.student.findMany({ orderBy: { createdAt: "desc" }, take: 25 });

  return (
    <div className="space-y-4">
      <form className="flex gap-2">
        <Input name="q" defaultValue={q} placeholder="Search name, student no. or LRN" />
        <Button type="submit">Search</Button>
      </form>

      <table className="w-full text-sm">
        <thead className="border-b text-left text-muted-foreground">
          <tr>
            <th className="py-2">Student No.</th>
            <th>Name</th>
            <th>Guardian</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id} className="border-b">
              <td className="py-2 font-mono">{s.studentNo}</td>
              <td>
                {s.lastName}, {s.firstName} {s.middleName ?? ""}
              </td>
              <td>{s.guardianName}</td>
              <td className="text-right">
                <Link className="text-primary underline" href={`/registrar/students/${s.id}`}>
                  Open / enroll
                </Link>
              </td>
            </tr>
          ))}
          {!students.length && (
            <tr>
              <td colSpan={4} className="py-6 text-center text-muted-foreground">
                No students found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
