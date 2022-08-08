import type { FormProps } from "@remix-run/react";
import { Form, useTransition } from "@remix-run/react";

export type LoadingFormProps = {
  children?: React.ReactNode | React.ReactNode[];
  submitButtonText: string;
  buttonClass?: string;
} & FormProps &
  React.RefAttributes<HTMLFormElement>;

export default function LoadingForm({
  children,
  submitButtonText,
  className,
  buttonClass,
  ...formProps
}: LoadingFormProps) {
  const transition = useTransition();
  return (
    <Form {...formProps}>
      <fieldset className={className} disabled={transition.state !== "idle"}>
        {children}
        <button
          className={`button ${buttonClass}`}
          data-submitting={transition.state === "submitting"}
          data-loading={transition.state === "loading"}
          type="submit"
        >
          {submitButtonText}
        </button>
      </fieldset>
    </Form>
  );
}
