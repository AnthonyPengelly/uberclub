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
  className,
  ...formProps
}: LoadingFormProps) {
  const transition = useTransition();
  const currentFormIsSubmitting =
    transition.state === "submitting" &&
    transition.submission.action === formProps.action;
  return (
    <Form {...formProps}>
      <fieldset className={className} disabled={transition.state !== "idle"}>
        {children}
        <button
          className="button"
          data-submitting={currentFormIsSubmitting}
          type="submit"
        >
          {submitButtonText}
        </button>
      </fieldset>
    </Form>
  );
}
