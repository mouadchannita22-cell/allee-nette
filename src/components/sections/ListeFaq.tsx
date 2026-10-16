import type { QuestionFrequente } from "@/content/faq";
import { fr } from "@/lib/typo";

/** Questions en accordéon natif (<details>), utilisable au clavier sans JavaScript. */
export function ListeFaq({ questions }: { questions: readonly QuestionFrequente[] }) {
  return (
    <ul className="divide-y divide-bord overflow-hidden rounded-carte border border-bord bg-blanc shadow-douce">
      {questions.map((q) => (
        <li key={q.id}>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 font-semibold transition-colors hover:bg-nuit/[0.03] [&::-webkit-details-marker]:hidden">
              {fr(q.question)}
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-full border border-bord text-lg text-accent transition-transform duration-300 group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="px-6 pb-6 text-doux">
              {fr(q.reponse)}
              {q.aConfirmer && <em className="a-completer ml-2 text-texte">[À CONFIRMER]</em>}
            </p>
          </details>
        </li>
      ))}
    </ul>
  );
}
