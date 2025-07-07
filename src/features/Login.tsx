"use client";

import { Button, Field } from "../components";
import * as z from "zod";

import { useZodForm } from "usezodform";
import { ErrorDisplay } from "../components/ErrorDisplay";
import "./Login.css";

const LoginSchema = z.object({
  email: z.string().email("Invalid email address").describe("Email Address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters long")
    .describe("Password"),
});

export type LoginFormData = z.infer<typeof LoginSchema>;

const onSubmit = (data: LoginFormData) =>
  console.log("Form submitted with data:", data);

export function Login() {
  const { getField, getForm, getError } = useZodForm<LoginFormData>(
    LoginSchema,
    onSubmit
  );

  const errors = getError();

  return (
    <>
      <form className="login" {...getForm()} noValidate>
        <ErrorDisplay errors={errors} />
        <Field
          {...getField("email")}
          type="email"
          required
          autoComplete="email"
        >
          Enter your username
        </Field>
        <Field
          {...getField("password")}
          type="password"
          required
          autoComplete="current-password"
        >
          Enter your password
        </Field>
        <Button type="submit" variant="standard" color="primary" size="fixed">
          Submit
        </Button>
      </form>
    </>
  );
}
