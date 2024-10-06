import { prisma } from "./db.server";
import { logger } from "./logger.server";

export async function unlockAccounts() {
  const now = new Date();
  const lockedAccounts = await prisma.user.findMany({
    where: {
      lockedUntil: {
        lt: now,
      },
    },
  });

  for (const account of lockedAccounts) {
    await prisma.user.update({
      where: { id: account.id },
      data: { lockedUntil: null, loginAttempts: 0 },
    });
    logger.info(`Unlocked account for user: ${account.email}`);
  }
}