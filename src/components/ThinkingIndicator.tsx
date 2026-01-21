import "./ThinkingIndicator.css";

type ThinkingIndicatorProps = {
  label?: string;
};

const ThinkingIndicator = ({ label = "Working" }: ThinkingIndicatorProps) => (
  <div className="thinking-indicator" role="status" aria-live="polite">
    <span className="thinking-indicator__orbs" aria-hidden="true">
      <span className="thinking-indicator__orb" />
      <span className="thinking-indicator__orb" />
      <span className="thinking-indicator__orb" />
    </span>
    <span className="thinking-indicator__label">{label}</span>
  </div>
);

export default ThinkingIndicator;
