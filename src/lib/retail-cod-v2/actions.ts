"use server";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { STAGES, type OrderStage } from "./stages";

const STAGE_PATHS = [
  "/retail-cod-new",
  "/retail-cod-new/pending",
  "/retail-cod-new/confirmed",
  "/retail-cod-new/hold",
  "/retail-cod-new/ready-to-pack",
  "/retail-cod-new/packed-dispatch",
];

function revalidateAllStagePaths() {
  for (const p of STAGE_PATHS) revalidatePath(p);
}

async function requireAuth() {
  const me = await getSessionUser();
  if (!me) throw new Error("Not authenticated");
  return me;
}

export async function setOrderStage(id: number, stage: OrderStage) {
  await requireAuth();
  if (!STAGES.includes(stage)) throw new Error("Invalid stage");
  await prisma.ecomOrder.update({ where: { id }, data: { stage, stageUpdatedAt: new Date() } });
  revalidateAllStagePaths();
}

export async function bulkSetOrderStage(ids: number[], stage: OrderStage) {
  await requireAuth();
  if (!ids.length) return;
  if (!STAGES.includes(stage)) throw new Error("Invalid stage");
  await prisma.ecomOrder.updateMany({ where: { id: { in: ids } }, data: { stage, stageUpdatedAt: new Date() } });
  revalidateAllStagePaths();
}
