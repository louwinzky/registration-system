import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@school.local";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "System Admin",
      role: Role.ADMIN,
      passwordHash: await bcrypt.hash(password, 12),
    },
  });

  const year = await prisma.schoolYear.upsert({
    where: { name: "2026-2027" },
    update: {},
    create: {
      name: "2026-2027",
      startDate: new Date("2026-06-01"),
      endDate: new Date("2027-03-31"),
      isCurrent: true,
    },
  });

  const levels = ["Grade 7", "Grade 8", "Grade 9", "Grade 10"];
  for (const [i, name] of levels.entries()) {
    const level = await prisma.gradeLevel.upsert({
      where: { name },
      update: {},
      create: { name, order: i + 7 },
    });
    await prisma.section.upsert({
      where: { gradeLevelId_name: { gradeLevelId: level.id, name: "A" } },
      update: {},
      create: { name: "A", gradeLevelId: level.id },
    });
    for (const [feeName, amount] of [
      ["Tuition", 15000],
      ["Miscellaneous", 3500],
    ] as const) {
      await prisma.feeSchedule.upsert({
        where: {
          schoolYearId_gradeLevelId_name: {
            schoolYearId: year.id,
            gradeLevelId: level.id,
            name: feeName,
          },
        },
        update: {},
        create: {
          schoolYearId: year.id,
          gradeLevelId: level.id,
          name: feeName,
          amount,
        },
      });
    }
  }

  console.log(`Seeded admin ${email}, school year ${year.name}`);
}

main().finally(() => prisma.$disconnect());
