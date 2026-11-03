import ConfirmButton from "@/components/ConfirmButton";
import ResultForm from "@/components/ResultForm";
import { Card, CardHeader, PageHeader, Table, Td, Th, btn, inputCls } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { daysLeft, fmtDate } from "@/lib/format";
import { addStaff, changePassword, removeStaff, updateStoreName } from "../actions";

const PLAN: Record<string, string> = { TRIAL: "Trial", STARTER: "Starter", GROWTH: "Growth", PRO: "Pro" };

export default async function SettingsPage() {
  const user = await requireUser();
  const owner = user.role === "OWNER";
  const users = await db.user.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: "asc" } });
  const left = daysLeft(user.tenant.expiresAt);

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Settings" />
      <Card>
        <CardHeader title="Subscription" />
        <div className="p-4 text-sm grid sm:grid-cols-3 gap-3">
          <div><p className="text-gray-500">Plan</p><p className="font-medium">{PLAN[user.tenant.plan]}</p></div>
          <div><p className="text-gray-500">Access until</p><p className="font-medium">{user.tenant.expiresAt ? fmtDate(user.tenant.expiresAt) : "No end date"}</p></div>
          <div><p className="text-gray-500">Remaining</p><p className="font-medium">{left === null ? "—" : `${Math.max(0, left)} day${left === 1 ? "" : "s"}`}</p></div>
        </div>
      </Card>

      {owner && (
        <Card>
          <CardHeader title="Store" />
          <form action={updateStoreName} className="p-4 flex gap-2">
            <input name="name" defaultValue={user.tenant.name} className={`${inputCls} max-w-sm`} aria-label="Store name" />
            <button className={btn("secondary")}>Save</button>
          </form>
        </Card>
      )}

      <Card>
        <CardHeader title="Team" />
        <Table>
          <thead><tr><Th>Name</Th><Th>Email</Th><Th>Role</Th><Th>Last login</Th><Th /></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <Td>{u.name}</Td>
                <Td className="text-gray-600">{u.email}</Td>
                <Td className="text-gray-600">{u.role === "OWNER" ? "Owner" : "Staff"}</Td>
                <Td className="text-gray-500">{u.lastLoginAt ? fmtDate(u.lastLoginAt) : "Never"}</Td>
                <Td right>
                  {owner && u.role === "STAFF" && (
                    <form action={removeStaff.bind(null, u.id)}>
                      <ConfirmButton message={`Remove ${u.name}?`} className={btn("ghost", "sm")}>Remove</ConfirmButton>
                    </form>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
        {owner && (
          <div className="p-4 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700 mb-2">Add a team member</p>
            <ResultForm action={addStaff} submitLabel="Add member" className="grid sm:grid-cols-3 gap-2 items-start">
              <input name="name" required placeholder="Name" className={inputCls} />
              <input name="email" type="email" required placeholder="Email" className={inputCls} />
              <input name="password" type="password" required minLength={8} placeholder="Password (8+ characters)" className={inputCls} />
            </ResultForm>
            <p className="text-xs text-gray-500 mt-2">Team members can manage orders and shipments. Only the owner can change integrations and the team.</p>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Change password" />
        <div className="p-4">
          <ResultForm action={changePassword} submitLabel="Change password" className="grid sm:grid-cols-2 gap-2 items-start">
            <input name="current" type="password" required placeholder="Current password" className={inputCls} autoComplete="current-password" />
            <input name="next" type="password" required minLength={8} placeholder="New password" className={inputCls} autoComplete="new-password" />
          </ResultForm>
        </div>
      </Card>
    </div>
  );
}
