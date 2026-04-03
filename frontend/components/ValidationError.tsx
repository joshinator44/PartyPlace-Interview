import type { ValidationResult } from "../types";

interface ValidationErrorProps {
  validation: ValidationResult;
  onSuggest: (query: string) => void;
}

export default function ValidationError({
  validation,
  onSuggest,
}: ValidationErrorProps) {
  return (
    <div className="validation-warning">
      <div className="validation-title">
        {"\u26A0\uFE0F"} We couldn&apos;t process your request
      </div>
      <ul className="validation-errors">
        {validation.errors.map((error, i) => (
          <li key={i}>{error}</li>
        ))}
      </ul>
      {validation.suggestedQuery && (
        <div
          className="validation-suggestion"
          onClick={() => onSuggest(validation.suggestedQuery)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSuggest(validation.suggestedQuery);
          }}
        >
          <strong>Try this instead:</strong> &ldquo;
          {validation.suggestedQuery}&rdquo;
        </div>
      )}
    </div>
  );
}
