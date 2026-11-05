import PDFDocument from "pdfkit";
import { db } from "@/lib/db";
import { formatDate, formatPeso } from "@/lib/utils";

/** Builds an official-receipt PDF (A5) and resolves with the file bytes. */
export async function buildReceiptPdf(paymentId: string): Promise<Buffer> {
  const p = await db.payment.findUniqueOrThrow({
    where: { id: paymentId },
    include: {
      receivedBy: true,
      enrollment: {
        include: { student: true, schoolYear: true, gradeLevel: true },
      },
    },
  });
  if (p.status !== "PAID" || !p.receiptNo) {
    throw new Error("Receipt is only available for paid payments.");
  }

  const doc = new PDFDocument({ size: "A5", margin: 36 });
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) =>
    doc.on("end", () => resolve(Buffer.concat(chunks))),
  );

  const s = p.enrollment.student;

  doc.fontSize(16).text(process.env.SCHOOL_NAME ?? "School", { align: "center" });
  doc.fontSize(9).text(process.env.SCHOOL_ADDRESS ?? "", { align: "center" });
  doc.moveDown().fontSize(13).text("OFFICIAL RECEIPT", { align: "center" });
  doc.moveDown();

  const row = (label: string, value: string) => {
    doc.fontSize(10).font("Helvetica-Bold").text(label, { continued: true });
    doc.font("Helvetica").text(`  ${value}`);
  };

  row("Receipt No:", p.receiptNo);
  row("Date:", formatDate(p.paidAt ?? p.createdAt));
  row("Student:", `${s.lastName}, ${s.firstName} ${s.middleName ?? ""}`.trim());
  row("Student No:", s.studentNo);
  row("Level / SY:", `${p.enrollment.gradeLevel.name} • ${p.enrollment.schoolYear.name}`);
  row("Method:", p.method);
  if (p.method === "CASH" && p.amountTendered) {
    row("Tendered:", formatPeso(p.amountTendered));
    row("Change:", formatPeso(Number(p.amountTendered) - Number(p.amount)));
  } else if (p.providerRef) {
    row("Reference:", p.providerRef);
  }

  doc.moveDown().fontSize(14).font("Helvetica-Bold");
  doc.text(`AMOUNT PAID: ${formatPeso(p.amount)}`, { align: "right" });

  doc.moveDown(2).fontSize(9).font("Helvetica");
  doc.text(`Received by: ${p.receivedBy?.name ?? "Online payment"}`);

  doc.end();
  return done;
}
