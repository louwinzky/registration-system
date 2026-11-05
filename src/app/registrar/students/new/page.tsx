import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { requireRole } from "@/lib/rbac";
import { studentSchema } from "@/lib/validation";
import { registerStudent } from "@/modules/registrar/service";

async function createStudent(formData: FormData) {
  "use server";
  await requireRole("REGISTRAR", "ADMIN");
  const parsed = studentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    redirect(`/registrar/students/new?error=${encodeURIComponent(msg)}`);
  }
  const student = await registerStudent(parsed.data);
  redirect(`/registrar/students/${student.id}`);
}

function Field({ name, label, type = "text", required = false }: {
  name: string; label: string; type?: string; required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required={required} />
    </div>
  );
}

export default async function NewStudentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Register new student</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={createStudent} className="grid gap-4 sm:grid-cols-2">
          <Field name="firstName" label="First name" required />
          <Field name="lastName" label="Last name" required />
          <Field name="middleName" label="Middle name" />
          <Field name="suffix" label="Suffix" />
          <div className="space-y-1.5">
            <Label htmlFor="sex">Sex</Label>
            <select id="sex" name="sex" required className="h-9 w-full rounded-md border bg-background px-3 text-sm">
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
          </div>
          <Field name="birthDate" label="Birth date" type="date" required />
          <Field name="birthPlace" label="Birth place" />
          <Field name="lrn" label="LRN (12 digits)" />
          <div className="sm:col-span-2"><Field name="address" label="Address" /></div>
          <Field name="guardianName" label="Guardian name" required />
          <Field name="guardianPhone" label="Guardian mobile (09XXXXXXXXX)" required />
          <Field name="guardianEmail" label="Guardian email" type="email" />
          {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
          <div className="sm:col-span-2">
            <Button type="submit">Save student</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
