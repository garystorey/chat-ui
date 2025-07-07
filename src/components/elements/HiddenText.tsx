export function HiddenText({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`sr-only ${className}`}
      style={{ position: "absolute", left: "-9999px" }}
    >
      {children}
    </span>
  );
}
