import { LoaderFunction, redirect } from "@remix-run/node";
import { prisma } from "~/utils/db.server";
import { logger } from "~/utils/logger.server";

export const loader: LoaderFunction = async ({ params }) => {
  const { token } = params;

  if (!token) {
    return redirect("/login?error=Invalid verification link");
  }

  try {
    const user = await prisma.user.findUnique({
      where: { verificationToken: token },
    });

    if (!user) {
      logger.warn(`Invalid verification token used: ${token}`);
      return redirect("/login?error=Invalid verification link");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, verificationToken: null },
    });

    logger.info(`User ${user.email} verified their email`);
    return redirect("/login?message=Email verified successfully. You can now log in.");
  } catch (error) {
    logger.error("Error verifying email:", error);
    return redirect("/login?error=An error occurred while verifying your email");
  }
};

export default function VerifyEmail() {
  return null;
}