import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLoaderData, useSearchParams, Link, Form } from "@remix-run/react";
import { json, LoaderFunction, ActionFunction } from "@remix-run/node";
import { requireUser } from "~/utils/session.server";
import { prisma } from "~/utils/db.server";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { editUserSchema, EditUserSchemaType } from "~/schemas/user";
import { csrfProtection } from "~/utils/csrf.server";

const ITEMS_PER_PAGE = 10;

export const loader: LoaderFunction = async ({ request }) => {
  await requireUser(request);
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const sortBy = url.searchParams.get("sortBy") || "name";
  const sortOrder = url.searchParams.get("sortOrder") || "asc";
  const filter = url.searchParams.get("filter") || "";

  const skip = (page - 1) * ITEMS_PER_PAGE;

  const where = filter
    ? {
        OR: [
          { name: { contains: filter, mode: "insensitive" } },
          { surname: { contains: filter, mode: "insensitive" } },
          { email: { contains: filter, mode: "insensitive" } },
        ],
      }
    : {};

  const [users, totalUsers] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, name: true, surname: true, email: true },
      skip,
      take: ITEMS_PER_PAGE,
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.ceil(totalUsers / ITEMS_PER_PAGE);

  const session = await getSession(request.headers.get("Cookie"));
  const csrfToken = await csrfProtection.commitToken(session);

  return json(
    { users, totalPages, page, sortBy, sortOrder, filter, csrfToken },
    {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    }
  );
};

export const action: ActionFunction = async ({ request }) => {
  const form = await request.formData();
  const action = form.get("_action");

  try {
    await csrfProtection.validate(request, form);

    switch (action) {
      case "delete":
        const userId = form.get("userId");
        await prisma.user.delete({ where: { id: userId } });
        return json({ success: true });
      case "edit":
        const submission = Object.fromEntries(form);
        try {
          const validatedFields = editUserSchema.parse(submission);
          await prisma.user.update({
            where: { id: submission.id },
            data: validatedFields,
          });
          return json({ success: true });
        } catch (error) {
          if (error instanceof z.ZodError) {
            return json({ errors: error.issues }, { status: 400 });
          }
          return json({ error: "An unexpected error occurred" }, { status: 500 });
        }
      default:
        return json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    return json({ error: "Invalid CSRF token" }, { status: 403 });
  }
};

export default function Users() {
  const { users, totalPages, page, sortBy, sortOrder, filter, csrfToken } = useLoaderData();
  // ... rest of the component logic ...

  const handleDelete = async (userId) => {
    const formData = new FormData();
    formData.append("_action", "delete");
    formData.append("userId", userId);
    formData.append("csrf", csrfToken);
    await fetch("/users", { method: "POST", body: formData });
    window.location.reload();
  };

  const handleEdit = async (data: EditUserSchemaType) => {
    const formData = new FormData();
    formData.append("_action", "edit");
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value);
    });
    formData.append("csrf", csrfToken);
    await fetch("/users", { method: "POST", body: formData });
    setEditingUser(null);
    window.location.reload();
  };

  // ... rest of the component ...

  return (
    <div className="container mx-auto p-4">
      {/* ... rest of the JSX ... */}
      <Form method="post" onSubmit={handleSubmit(handleEdit)}>
        <input type="hidden" name="csrf" value={csrfToken} />
        {/* ... rest of the form fields ... */}
      </Form>
      {/* ... rest of the JSX ... */}
    </div>
  );
}