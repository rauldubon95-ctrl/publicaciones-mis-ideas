import { headers } from "next/headers";

interface Props {
  data: Record<string, unknown> | Record<string, unknown>[];
}

export default async function JsonLd({ data }: Props) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
