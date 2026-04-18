import { Role } from "@/generated/prisma";

export type MessagingAccessContext = {
  userId: string;
  userType: Role;
  teamId: string | null;
  vendorCompanyId: string | null;
  clientIds: string[];
  roleKeys: string[];
  permissionKeys: string[];
};
