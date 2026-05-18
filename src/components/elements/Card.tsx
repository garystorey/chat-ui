import { ComponentProps, memo, useId } from "react";
import Heading from "./Heading";
import "./Card.css";

type CardProps = ComponentProps<"div"> & {
  title: string;
  description: string;
  label: string;
  icon: string;
  onSelect: () => void;
};

function Card({
  title,
  description,
  label,
  icon,
  onSelect,
  className = "",
  ...props
}: CardProps) {
  const titleId = useId();
  const descriptionId = useId();

  const classes = `suggestion-card ${className}`.trim();

  return (
    <div
      {...props}
      className={classes}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <div className="suggestion-card__icon" aria-hidden="true">
        {icon}
      </div>
      <Heading
        as="h3"
        size="medium"
        variant="caps"
        id={titleId}
        className="suggestion-card__title"
      >
        {title}
      </Heading>
      <p id={descriptionId} className="suggestion-card__description">
        {description}
      </p>
      <button
        type="button"
        className="suggestion-card__cta"
        onClick={onSelect}
        aria-describedby={`${titleId} ${descriptionId}`}
        title={label}
      >
        <span>{label}</span>
        <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
          <path d="M5 12h13" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      </button>
    </div>
  );
}

export default memo(Card);
