import { memo } from "react";
import { Card, Heading, List } from "../elements";
import { Suggestion } from "../../types";

type SuggesionsProps = {
  suggestions: Suggestion[];
  classes?: string[];
};

const Suggestions = ({ suggestions, classes = [""] }: SuggesionsProps) => {
  return (
    <section className={classes.join(" ")}>
      <Heading
        as="h2"
        size="medium"
        textAlign="center"
        id="suggestions-heading"
        className="sr-only"
      >
        Suggested prompts
      </Heading>
      <List<Suggestion>
        className="suggestions__list"
        items={suggestions}
        keyfield="id"
        as={(suggestion) => (
          <Card
            key={suggestion.id}
            className="suggestions__item"
            title={suggestion.title}
            description={suggestion.description}
            label={suggestion.actionLabel}
            icon={suggestion.icon}
            onSelect={suggestion.handleSelect}
          />
        )}
      />
    </section>
  );
};

export default memo(Suggestions);
