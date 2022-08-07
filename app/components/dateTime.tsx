export type DateTimeProps = {
  dateTime: string;
};

export default function DateTime({ dateTime }: DateTimeProps) {
  const date = new Date(dateTime);
  return (
    <>
      {date.getHours().toString().padStart(2, "0")}:
      {date.getMinutes().toString().padStart(2, "0")}{" "}
      {date.getDate().toString().padStart(2, "0")}/
      {(date.getMonth() + 1).toString().padStart(2, "0")}
    </>
  );
}
