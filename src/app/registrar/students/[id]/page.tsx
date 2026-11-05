import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { enrollmentSchema } from "@/lib/validation";
import { enrollStudent, getCurrentSchoolYear } from "@/modules/registrar/service";

async function enroll(formData: FormData) {
  "use server";
  const user = await requireRole("REGISTRAR", "ADMIN");
  const raw = Object.fromEntries(formData);
  const parsed = enrollmentSchema.safeParse({
    ...raw,
    sectionId: raw.sectionId || undefined,
  });
  if (!parsed.success) redirect(`/registrar/students/${raw.studentId}?error=invalid`);
  try {
    await enrollStudent(parsed.data, user.id);
  } catch {
    redirect(`/registrar/students/${parsed.data.studentId}?error=duplicate`);
  }
  redirect(`/registrar/students/${parsed.data.studentId}`);
}

export default async function StudentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const student = await db.student.findUnique({
    where: { id },
    include: {
      enrollments: {
        include: { schoolYear: true, gradeLevel: true, section: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!student) notFound();

  const sy = await getCurrentSchoolYear();
  const levels = await db.gradeLevel.findMany({
    orderBy: { order: "asc" },
    include: { sections: true },
  });
  const enrolledThisYear = student.enrollments.some((e) => e.schoolYearId === sy.id);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>
            {student.lastName}, {student.firstName} {student.middleName ?? ""}
          </CardTitle>
          <p className="font-mono text-sm text-muted-foreground">{student.studentNo}</p>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>LRN: {student.lrn ?? "—"}</p>
          <p>Guardian: {student.guardianName} ({student.guardianPhone})</p>
          <p>Address: {student.address ?? "—"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Enrollment — SY {sy.name}</CardTitle>
        </CardHeader>
        <CardContent>
          {enrolledThisYear ? (
            <p className="text-sm text-muted-foreground">
              Already registered for this school year. The Cashier can now collect payment.
            </p>
          ) : (
            <form action={enroll} className="space-y-3">
              <input type="hidden" name="studentId" value={student.id} />
              <select name="gradeLevelId" required className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                {levels.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
              <select name="sectionId" className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">Section (assign later)</option>
                {levels.flatMap((l) =>
                  l.sections.map((s) => (
                    <option key={s.id} value={s.id}>{l.name} – {s.name}</option>
                  )),
                )}
              </select>
              {error && <p className="text-sm text-red-600">Could not enroll. Check the details.</p>}
              <Button type="submit">Enroll</Button>
            </form>
          )}

          <ul className="mt-4 space-y-1 text-sm">
            {student.enrollments.map((e) => (
              <li key={e.id}>
                {e.schoolYear.name} • {e.gradeLevel.name} • <b>{e.status}</b>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
