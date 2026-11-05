import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { enrollmentSchema, studentSchema } from "@/lib/validation";
import { z } from "zod";

/** Generates student numbers like 2026-00001 inside the caller's transaction. */
async function nextStudentNo(tx: Prisma.TransactionClient) {
  const year = new Date().getFullYear();
  const counter = await tx.studentCounter.upsert({
    where: { year },
    update: { last: { increment: 1 } },
    create: { year, last: 1 },
  });
  return `${year}-${String(counter.last).padStart(5, "0")}`;
}

export async function registerStudent(input: z.infer<typeof studentSchema>) {
  const data = studentSchema.parse(input);
  return db.$transaction(async (tx) => {
    const studentNo = await nextStudentNo(tx);
    return tx.student.create({ data: { ...data, studentNo } });
  });
}

export async function getCurrentSchoolYear() {
  const sy = await db.schoolYear.findFirst({ where: { isCurrent: true } });
  if (!sy) throw new Error("No current school year is configured.");
  return sy;
}

/**
 * Creates an enrollment and snapshots the fee schedule into Charges,
 * so later fee changes don't rewrite what a student already owes.
 */
export async function enrollStudent(
  input: z.infer<typeof enrollmentSchema>,
  createdById: string,
) {
  const data = enrollmentSchema.parse(input);
  const schoolYear = await getCurrentSchoolYear();

  return db.$transaction(async (tx) => {
    const enrollment = await tx.enrollment.create({
      data: { ...data, schoolYearId: schoolYear.id, createdById },
    });

    const fees = await tx.feeSchedule.findMany({
      where: { schoolYearId: schoolYear.id, gradeLevelId: data.gradeLevelId },
    });
    if (fees.length) {
      await tx.charge.createMany({
        data: fees.map((f) => ({
          enrollmentId: enrollment.id,
          description: f.name,
          amount: f.amount,
        })),
      });
    }
    return enrollment;
  });
}

export async function searchStudents(q: string) {
  const term = q.trim();
  if (!term) return [];
  return db.student.findMany({
    where: {
      OR: [
        { lastName: { contains: term, mode: "insensitive" } },
        { firstName: { contains: term, mode: "insensitive" } },
        { studentNo: { contains: term } },
        { lrn: { contains: term } },
      ],
    },
    take: 25,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}
