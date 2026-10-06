import CampaignRail from "@/components/home/CampaignRail";
import { CAMPAIGN } from "@/lib/data";

/**
 * The season's lookbook: a pinned contact sheet that slides sideways.
 *
 * Server component on purpose: it reads `CAMPAIGN` from data.ts and hands the
 * client rail only the four strings per look it draws, so the data module never
 * reaches the browser bundle.
 *
 * No product links, by design. See the note on `CAMPAIGN` in data.ts: these are
 * campaign frames, and pointing one at a code would have the site assert
 * something the photograph was never lit to say. The rail links to the
 * collection instead.
 */
export default function Campaign({ n }: { n: number }) {
  return (
    <CampaignRail
      n={n}
      season={CAMPAIGN.season}
      title={CAMPAIGN.title}
      looks={CAMPAIGN.looks.map(({ id, src, alt, note }) => ({ id, src, alt, note }))}
      cta={{ href: "/product", label: "Xem bộ sưu tập →" }}
    />
  );
}
