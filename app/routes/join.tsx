import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useSearchParams } from "@remix-run/react";
import { createUserSession, getUserId } from "~/session.server";
import { createUser, getProfileByEmail } from "~/domain/user.server";
import { validateEmail } from "~/userUtils";
import * as React from "react";
import Layout from "~/components/layout";

export const meta: MetaFunction = () => {
  return {
    title: "Sign Up",
  };
};

interface ActionData {
  errors: {
    email?: string;
    password?: string;
  };
}

export const loader: LoaderFunction = async ({ request }) => {
  const userId = await getUserId(request);
  if (userId) return redirect("/");
  return json({});
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");
  const redirectTo = formData.get("redirectTo");

  // Ensure the email is valid
  if (!validateEmail(email)) {
    return json<ActionData>(
      { errors: { email: "Email is invalid." } },
      { status: 400 }
    );
  }

  // What if a user sends us a password through other means than our form?
  if (typeof password !== "string") {
    return json(
      { errors: { password: "Valid password is required." } },
      { status: 400 }
    );
  }

  // Enforce minimum password length
  if (password.length < 6) {
    return json<ActionData>(
      { errors: { password: "Password is too short." } },
      { status: 400 }
    );
  }

  // A user could potentially already exist within our system
  // and we should communicate that well
  const existingUser = await getProfileByEmail(email);
  if (existingUser) {
    return json<ActionData>(
      { errors: { email: "A user already exists with this email." } },
      { status: 400 }
    );
  }

  const user = await createUser(email, password);

  return createUserSession({
    request,
    userId: user.id,
    remember: false,
    redirectTo: typeof redirectTo === "string" ? redirectTo : "/",
  });
};

export default function Join() {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? undefined;

  const actionData = useActionData() as ActionData;
  const emailRef = React.useRef<HTMLInputElement>(null);
  const passwordRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (actionData?.errors?.email) {
      emailRef?.current?.focus();
    }

    if (actionData?.errors?.password) {
      passwordRef?.current?.focus();
    }
  }, [actionData]);

  return (
    <Layout>
      <Form method="post" className="flow" noValidate>
        <div>
          <label htmlFor="email">
            <div>Email Address</div>
            {actionData?.errors?.email && (
              <div id="email-error">{actionData?.errors?.email}</div>
            )}
          </label>
          <input
            type="email"
            name="email"
            id="email"
            required
            aria-invalid={actionData?.errors?.email ? true : undefined}
            aria-describedby="email-error"
            ref={emailRef}
          />
        </div>
        <div>
          <label htmlFor="password">
            <div>Password</div>
            {actionData?.errors?.password && (
              <div id="password-error">{actionData?.errors?.password}</div>
            )}
          </label>
          <input
            id="password"
            type="password"
            name="password"
            autoComplete="new-password"
            aria-invalid={actionData?.errors?.password ? true : undefined}
            aria-describedby="password-error"
            ref={passwordRef}
          />
        </div>
        <button className="button" type="submit">
          Create Account
        </button>
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <div>
          <div>
            Already have an account?{" "}
            <Link
              to={{
                pathname: "/login",
                search: searchParams.toString(),
              }}
            >
              Log in
            </Link>
          </div>
        </div>
      </Form>
    </Layout>
  );
}
