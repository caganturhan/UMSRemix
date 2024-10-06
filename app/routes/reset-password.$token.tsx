import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, useActionData, useSubmit, useParams } from "@remix-run/react";
import { json, redirect, ActionFunction, LoaderFunction } from "@remix-run/node";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { z } from "zod";
import { prisma } from "~/utils/db.server";
import bcrypt from "bcryptjs";

const resetPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters long"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordSchemaType = z.infer<typeof resetPasswordSchema>;

export const loader: LoaderFunction = async ({ params }) => {
  const { token } = params;

  if (!token) {
    return redirect("/login?error=Invalid reset link");
  }

  const user = await prisma.user.findUnique({
    where: { resetPasswordToken: token },
  });

  if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
    return redirect("/login?error=Invalid or expired reset link");
  }

  return null;
};

export const action: ActionFunction = async ({ request, params }) => {
  const { token } = params;
  const formData = await request.formData();
  const submission = Object.fromEntries(formData);

  try {
    const { password } = resetPasswordSchema.parse(submission);

    const user = await prisma.user.findUnique({
      where: { resetPasswordToken: token },
    });

    if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      return redirect("/login?error=Invalid or expired reset link");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    return redirect("/login?message=Password reset successfully. You can now log in with your new password.");
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ errors: error.issues }, { status: 400 });
    }
    return json({ error: "An unexpected error occurred" }, { status: 500 });
  }
};

export default function ResetPassword() {
  const actionData = useActionData();
  const submit = useSubmit();
  const { token } = useParams();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordSchemaType>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = (data: ResetPasswordSchemaType) => {
    submit(data, { method: "post" });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-4xl font-bold mb-8">Reset Password</h1>
      <Form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-xs">
        <input type="hidden" name="token" value={token} />
        <div className="mb-4">
          <Label htmlFor="password">New Password</Label>
          <Input
            type="password"
            id="password"
            {...register("password")}
            className={errors.password ? "border-red-500" : ""}
          />
          {errors.password && (
            <p className="text-red-500 text-xs italic">{errors.password.message}</p>
          )}
        </div>
        <div className="mb-6">
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <Input
            type="password"
            id="confirmPassword"
            {...register("confirmPassword")}
            className={errors.confirmPassword ? "border-red-500" : ""}
          />
          {errors.confirmPassword && (
            <p className="text-red-500 text-xs italic">{errors.confirmPassword.message}</p>
          )}
        </div>
        {actionData?.error && (
          <p className="text-red-500 text-xs italic mb-4">{actionData.error}</p>
        )}
        <Button type="submit" className="w-full">
          Reset Password
        </Button>
      </Form>
    </div>
  );
}