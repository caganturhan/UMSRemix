import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, useActionData, useSubmit, useLoaderData } from "@remix-run/react";
import { json, redirect, ActionFunction, LoaderFunction } from "@remix-run/node";
import { createUser } from "~/utils/session.server";
import { sendVerificationEmail } from "~/utils/email.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { userSchema, UserSchemaType } from "~/schemas/user";
import { prisma } from "~/utils/db.server";
import { v4 as uuidv4 } from 'uuid';
import { csrfProtection } from "~/utils/csrf.server";

export const loader: LoaderFunction = async ({ request }) => {
  const session = await getSession(request.headers.get("Cookie"));
  const token = await csrfProtection.commitToken(session);
  return json({ csrfToken: token }, {
    headers: {
      "Set-Cookie": await commitSession(session),
    },
  });
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const submission = Object.fromEntries(formData);

  try {
    await csrfProtection.validate(request, formData);

    const validatedFields = userSchema.parse(submission);
    const verificationToken = uuidv4();
    const user = await createUser({
      ...validatedFields,
      verificationToken,
      isVerified: false,
    });
    if (!user) {
      return json(
        { error: "Something went wrong trying to create a new user" },
        { status: 400 }
      );
    }
    await sendVerificationEmail(user.email, verificationToken);
    return json({ success: true, message: "Please check your email to verify your account." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ errors: error.issues }, { status: 400 });
    }
    return json({ error: "An unexpected error occurred" }, { status: 500 });
  }
};

export default function Register() {
  const actionData = useActionData();
  const submit = useSubmit();
  const { csrfToken } = useLoaderData();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserSchemaType>({
    resolver: zodResolver(userSchema),
  });

  const onSubmit = (data: UserSchemaType) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => formData.append(key, value));
    formData.append("csrf", csrfToken);
    submit(formData, { method: "post" });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-4xl font-bold mb-8">Register</h1>
      <Form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-xs">
        <input type="hidden" name="csrf" value={csrfToken} />
        {/* ... rest of the form fields ... */}
        <Button type="submit" className="w-full">
          Register
        </Button>
      </Form>
      {/* ... rest of the component ... */}
    </div>
  );
}