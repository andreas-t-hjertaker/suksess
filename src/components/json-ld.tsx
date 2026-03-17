/**
 * Strukturert data (JSON-LD) for søkemotoroptimalisering.
 * Rendrer en <script type="application/ld+json">-tag.
 */

type JsonLdProps = {
  data: Record<string, unknown>;
};

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/** Schema.org WebSite-markup */
export function WebsiteJsonLd({
  name,
  url,
  description,
}: {
  name: string;
  url: string;
  description: string;
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name,
        url,
        description,
      }}
    />
  );
}
