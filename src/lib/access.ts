export const ALLOWED_USER_IDS = [
  "5883260f-3c5f-4136-afb8-269bb1a9f621",
  "419809cf-ec16-443e-a6fc-cd6d9c913bf9",
] as const;

export function isAllowedUser(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return (ALLOWED_USER_IDS as readonly string[]).includes(userId);
}
