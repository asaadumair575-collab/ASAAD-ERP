import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export const getBusinessProfile = unstable_cache(
  async () => prisma.businessProfile.findFirst(),
  ["business-profile"],
  { tags: ["business-profile"] }
);
