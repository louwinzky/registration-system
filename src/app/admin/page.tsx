import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { userSchema } from "@/lib/validation";

async function createUser(formData: FormData) {
  "use server";
  await requireRole("ADMIN");
  const parsed = userSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/admin?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }
  const { password, email, ...rest } = parsed.data;
  try {
    await db.user.create({
      data: {
        ...rest,
        email: email.toLowerCase(),
        passwordHash: await bcrypt.hash(password, 12),
      },
    });
  } catch {
    redirect("/admin?error=Email+already+exists");
  }
  revalidatePath("/admin");
}

async function toggleActive(formData: FormData) {
  "use server";
  const me = await requireRole("ADMIN");
  const id = String(formData.get("id"));
  if (id === me.id) return; // don't lock yourself out
  const u = await db.user.findUniqueOrThrow({ where: { id } });
  await db.user.update({ where: { id }, data: { active: !u.active } });
  revalidatePath("/admin");
}

export default async function AdminUsers({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const users = await db.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
      <Card>
        <CardHeader><CardTitle>Users</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b">
                  <td className="py-2">{u.name}<div className="text-xs text-muted-foreground">{u.email}</div></td>
                  <td>{u.role}</td>
                  <td>{u.active ? "Active" : "Disabled"}</td>
                  <td className="text-right">
                    <form action={toggleActive}>
                      <input type="hidden" name="id" value={u.id} />
                      <Button variant="ghost" size="sm">{u.active ? "Disable" : "Enable"}</Button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Add user</CardTitle></CardHeader>
        <CardContent>
          <form action={createUser} className="space-y-3">
            <div className="space-y-1.5"><Label>Full name</Label><Input name="name" required /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input name="email" type="email" required /></div>
            <div className="space-y-1.5"><Label>Temporary password</Label><Input name="password" type="password" required minLength={8} /></div>
            <select name="role" className="h-9 w-full rounded-md border bg-background px-3 text-sm">
              <option value="REGISTRAR">Registrar</option>
              <option value="CASHIER">Cashier</option>
              <option value="ADMIN">Admin</option>
            </select>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit">Create</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
