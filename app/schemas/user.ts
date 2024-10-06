import { z } from "zod";

export const userSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long"),
  surname: z.string().min(2, "Surname must be at least 2 characters long"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

export const editUserSchema = userSchema.omit({ password: true });

export type UserSchemaType = z.infer<typeof userSchema>;
export type LoginSchemaType = z.infer<typeof loginSchema>;
export type EditUserSchemaType = z.infer<typeof editUserSchema>;