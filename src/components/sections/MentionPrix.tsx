import { site } from "@/config/site";

/** Mention obligatoire près des prix. */
export function MentionPrix({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs text-doux ${className}`}>
      Prix TTC, en euros. {site.mentionTva}.
    </p>
  );
}
