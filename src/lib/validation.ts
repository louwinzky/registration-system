import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(["ADMIN", "REGISTRAR", "CASHIER"]),
  password: z.string().min(8, "At least 8 characters"),
});

export const studentSchema = z.object({
  lrn: z
    .string()
    .regex(/^\d{12}$/, "LRN must be 12 digits")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  firstName: z.string().min(1),
  middleName: z.string().optional(),
  lastName: z.string().min(1),
  suffix: z.string().optional(),
  sex: z.enum(["MALE", "FEMALE"]),
  birthDate: z.coerce.date(),
  birthPlace: z.string().optional(),
  address: z.string().optional(),
  guardianName: z.string().min(2),
  guardianPhone: z.string().regex(/^(09|\+639)\d{9}$/, "Use a PH mobile number"),
  guardianEmail: z
    .string()
    .email()
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const enrollmentSchema = z.object({
  studentId: z.string().cuid(),
  gradeLevelId: z.string().cuid(),
  sectionId: z.string().cuid().optional(),
});

export const cashPaymentSchema = z.object({
  enrollmentId: z.string().cuid(),
  amount: z.coerce.number().positive(),
  amountTendered: z.coerce.number().positive(),
});

export const onlinePaymentSchema = z.object({
  enrollmentId: z.string().cuid(),
  amount: z.coerce.number().min(100, "Minimum online payment is PHP 100"),
  method: z.enum(["GCASH", "MAYA"]),
});

export const voidPaymentSchema = z.object({
  paymentId: z.string().cuid(),
  reason: z.string().min(5, "Please give a reason"),
});
