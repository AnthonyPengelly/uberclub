import type { FormProps } from "@remix-run/react";
import { Form, useTransition } from "@remix-run/react";

export type LoadingFormProps = {
  children?: React.ReactNode | React.ReactNode[];
  submitButtonText: string;
} & FormProps &
  React.RefAttributes<HTMLFormElement>;

export default function LoadingForm({
  children,
  submitButtonText,
  ...formProps
}: LoadingFormProps) {
  const transition = useTransition();
  return (
    <Form {...formProps}>
      <fieldset disabled={transition.state !== "idle"}>
        {children}
        <button
          className="button"
          data-submitting={transition.state === "submitting"}
          type="submit"
        >
          {submitButtonText}
        </button>
      </fieldset>
    </Form>
  );
}
