/// <reference types="node" />
import { prisma } from "../utils/prisma";
import type { AppUser, Role } from "@repo/shared";

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email, isActive: true },
    include: { role: true },
  });
}

export async function findUserById(id: number) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { role: true },
  });
  if (!user) return null;
  return {
    id: user.id.toString(),
    email: user.email,
    name: user.name,
    company: user.company ?? "",
    cardCode: user.cardCode,
    role: user.role.name as Role,
    isActive: user.isActive,
  };
}