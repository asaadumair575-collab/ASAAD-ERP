export function userLabel(user: { displayName?: string | null; username: string; isAdmin?: boolean }) {
  if (user.isAdmin) return "Admin";
  return user.displayName ?? user.username;
}
