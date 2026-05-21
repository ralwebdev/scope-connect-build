import { useId } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export interface FAQItem {
  q: string;
  a: string;
}

interface FAQSectionProps {
  title?: string;
  subtitle?: string;
  items: FAQItem[];
  /** Emit a FAQPage JSON-LD block. Default true. */
  jsonLd?: boolean;
}

/**
 * Additive, reusable FAQ block. Reuses existing card/accordion tokens, so it
 * inherits dark/light themes and responsive spacing automatically.
 */
export function FAQSection({ title = "Frequently asked questions", subtitle, items, jsonLd = true }: FAQSectionProps) {
  const id = useId();
  const ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h2 className="text-2xl font-bold text-foreground sm:text-3xl">{title}</h2>
      {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
      <Accordion type="single" collapsible className="mt-6 w-full">
        {items.map((it, i) => (
          <AccordionItem key={i} value={`${id}-${i}`}>
            <AccordionTrigger className="text-left text-sm font-medium">{it.q}</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">{it.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      {jsonLd && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
        />
      )}
    </section>
  );
}
