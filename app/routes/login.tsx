import React from "react";
import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useSearchParams } from "@remix-run/react";
import { verifyLogin } from "~/domain/user.server";
import { createUserSession, getUserId } from "~/session.server";
import { validateEmail } from "~/userUtils";
import Layout from "~/components/layout";

export const meta: MetaFunction = () => {
  return {
    title: "Login",
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
  const remember = formData.get("remember");

  if (!validateEmail(email)) {
    return json({ errors: { email: "Email is invalid." } }, { status: 400 });
  }

  if (typeof password !== "string") {
    return json(
      { errors: { password: "Valid password is required." } },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return json(
      { errors: { password: "Password is too short" } },
      { status: 400 }
    );
  }

  const user = await verifyLogin(email, password);

  if (!user) {
    return json(
      { errors: { email: "Invalid email or password" } },
      { status: 400 }
    );
  }

  return createUserSession({
    request,
    userId: user.id,
    remember: remember === "on" ? true : false,
    redirectTo: typeof redirectTo === "string" ? redirectTo : "/",
  });
};

export default function Login() {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/";

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
              <div className="error" id="email-error">
                {actionData?.errors?.email}
              </div>
            )}
          </label>
          <input
            autoComplete="email"
            type="email"
            name="email"
            id="email"
            aria-invalid={actionData?.errors?.email ? true : undefined}
            aria-describedby="email-error"
            ref={emailRef}
          />
        </div>
        <div>
          <label htmlFor="password">
            <div>Password</div>
            {actionData?.errors?.password && (
              <span className="error" id="password-error">
                {actionData?.errors?.password}
              </span>
            )}
          </label>
          <input
            id="password"
            type="password"
            name="password"
            autoComplete=""
            aria-invalid={actionData?.errors?.password ? true : undefined}
            aria-describedby="password-error"
            ref={passwordRef}
          />
        </div>
        <button className="button" type="submit">
          Log in
        </button>
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <div>
          <input id="remember" name="remember" type="checkbox" />
          <label htmlFor="remember">Remember me</label>
        </div>
        <div>
          Don't have an account?{" "}
          <Link to={{ pathname: "/join", search: searchParams.toString() }}>
            Sign up
          </Link>
        </div>
      </Form>
    </Layout>
  );
}
