import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, useActionData, useSubmit } from "@remix-run/react";
import { json, ActionFunction } from "@remix-run/node";
import { sendPasswordResetEmail } from "~/utils/email.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { z } from "zod";
import { prisma } from "~/utils/db.server";
import { v4 as uuidv4 } from 'uuid';

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type ForgotPasswordSchemaType = z.infer<typeof forgotPasswordSchema>;

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const submission = Object.fromEntries(formData);

  try {
    const { email } = forgotPasswordSchema.parse(submission);
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const resetToken = uuidv4();
      const resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour from now

      await prisma.user.update({
        where: { id: user.id },
        data: { resetPasswordToken: resetToken, resetPasswordExpires },
      });

      await sendPasswordResetEmail(email, resetToken);
    }

    // Always return a success message to prevent email enumeration
    return json({ success: true, message: "If an account with that email exists, we've sent a password reset link." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ errors: error.issues }, { status: 400 });
    }
    return json({ error: "An unexpected error occurred" }, { status: 500 });
  }
};

export default function ForgotPassword() {
  const actionData = useActionData();
  const submit = useSubmit();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordSchemaType>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = (data: ForgotPasswordSchemaType) => {
    submit(data, { method: "post" });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-4xl font-bold mb-8">Forgot Password</h1>
      <Form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-xs">
        <div className="mb-4">
          <Label htmlFor="email">Email</Label>
          <Input
            type="email"
            id="email"
            {...register("email")}
            className={errors.email ? "border-red-500" : ""}
          />
          {errors.email && (
            <p className="text-red-500 text-xs italic">{errors.email.message}</p>
          )}
        </div>
        {actionData?.error && (
          <p className="text-red-500 text-xs italic mb-4">{actionData.error}</p>
        )}
        {actionData?.message && (
          <p className="text-green-500 text-xs italic mb-4">{actionData.message}</p>
        )}
        <Button type="submit" className="w-full">
          Reset Password
        </Button>
      </Form>
    </div>
  );
}