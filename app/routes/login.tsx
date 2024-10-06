import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, useActionData, useSubmit, Link, useLoaderData } from "@remix-run/react";
import { json, redirect, ActionFunction, LoaderFunction } from "@remix-run/node";
import { createUserSession, login } from "~/utils/session.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { loginSchema, LoginSchemaType } from "~/schemas/user";
import { prisma } from "~/utils/db.server";
import { unlockAccounts } from "~/utils/accountUnlock.server";
import { csrfProtection } from "~/utils/csrf.server";

export const loader: LoaderFunction = async ({ request }) => {
  await unlockAccounts();
  return null;
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const submission = Object.fromEntries(formData);

  try {
    await csrfProtection.validate(request, formData);

    const validatedFields = loginSchema.parse(submission);
    const user = await login(validatedFields);
    if (!user) {
      return json({ error: "Invalid credentials" }, { status: 400 });
    }

    // Check if the user's email is verified
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser?.isVerified) {
      return json({ error: "Please verify your email before logging in" }, { status: 400 });
    }

    return createUserSession(user.id, "/");
  } catch (error) {
    if (error instanceof Error) {
      return json({ error: error.message }, { status: 400 });
    }
    if (error instanceof z.ZodError) {
      return json({ errors: error.issues }, { status: 400 });
    }
    return json({ error: "An unexpected error occurred" }, { status: 500 });
  }
};

export default function Login() {
  const actionData = useActionData();
  const submit = useSubmit();
  const { csrfToken } = useLoaderData();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginSchemaType>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginSchemaType) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => formData.append(key, value));
    formData.append("csrf", csrfToken);
    submit(formData, { method: "post" });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-4xl font-bold mb-8">Login</h1>
      <Form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-xs">
        <input type="hidden" name="csrf" value={csrfToken} />
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
        <div className="mb-6">
          <Label htmlFor="password">Password</Label>
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
        {actionData?.error && (
          <p className="text-red-500 text-xs italic mb-4">{actionData.error}</p>
        )}
        <Button type="submit" className="w-full">
          Log In
        </Button>
      </Form>
      <div className="mt-4">
        <Link to="/forgot-password" className="text-blue-500 hover:underline">
          Forgot Password?
        </Link>
      </div>
      <div className="mt-2">
        <Link to="/register" className="text-blue-500 hover:underline">
          Don't have an account? Register
        </Link>
      </div>
    </div>
  );
}