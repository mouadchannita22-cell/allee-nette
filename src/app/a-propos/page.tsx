import { site, zoneActive } from "@/config/site";
import { CONDITIONS } from "@/data/conditions";
import { GARANTIE } from "@/data/offres";
import { lienEmail, lienTelephone, lienWhatsApp } from "@/lib/contact";
import { metadonnees } from "@/lib/seo";
import { ACompleter } from "@/components/ui/ACompleter";
import { EnTetePage, EnTeteSection } from "@/components/sections/EnTetes";
import { AppelFinal } from "@/components/sections/Divers";

export const metadata = metadonnees({
  titre: "Qui sommes-nous",
  description: `Deux étudiants entrepreneurs qui nettoient votre voiture chez vous, à ${zoneActive.ville} et alentour. Assurés, prix fermes, retouche gratuite sous ${CONDITIONS.retoucheHeures} h.`,
  chemin: "/a-propos",
});

const ENGAGEMENTS = [
  {
    titre: "Un prix ferme, avant le rendez-vous",
    texte: `Confirmé sur vos photos sous ${CONDITIONS.delaiPrixFermeHeures} heures. Aucun supplément n'est imposé sur place.`,
  },
  { titre: "La vérité sur ce qui est récupérable", texte: "Une tache ancienne peut seulement s'atténuer : nous vous le disons avant, sur photo." },
  { titre: GARANTIE.nom, texte: GARANTIE.texte },
  { titre: "Votre voiture reste votre voiture", texte: "Nous ne la conduisons jamais. État des lieux en photo à l'arrivée, contrôle avec vous à la fin." },
  { titre: "Aucun rejet d'eau", texte: `Lavage sans rinçage, environ ${CONDITIONS.eauLitres} litres de notre eau, rien dans le caniveau.` },
  { titre: "Pas de faux avis", texte: "Pas de note inventée ni de chiffre gonflé : nos avis seront les vôtres, sur notre fiche Google." },
] as const;

export default function PageAPropos() {
  const telephone = lienTelephone();
  const whatsapp = lienWhatsApp("Bonjour Allée Nette !");
  const email = lienEmail();

  return (
    <>
      <EnTetePage
        surtitre="Qui sommes-nous"
        titre="Deux étudiants, une exigence : bien faire."
        intro={
          <p>
            Deux étudiants entrepreneurs de <ACompleter valeur={site.villeAssocies} libelle="votre ville" />, formés,
            assurés et équipés, qui préfèrent bien faire que vite faire.
          </p>
        }
      />

      <section aria-labelledby="titre-modele" className="theme-clair py-24 md:py-32">
        <div className="conteneur grid gap-12 lg:grid-cols-2">
          <EnTeteSection
            id="titre-modele"
            surtitre="Notre modèle"
            titre="Pas de station, pas d'atelier : on vient chez vous."
          />
          <div className="space-y-5 text-lg text-doux">
            <p>
              Nous intervenons uniquement à domicile, sur votre emplacement privé : allée, cour, garage, ou place de
              copropriété avec l'accord du syndic. Nous apportons notre eau et tout le matériel ; il nous faut seulement
              une prise électrique.
            </p>
            <p>
              {site.nom} est le nom commercial que nous partageons. Chacun de nous est entrepreneur individuel et facture
              les prestations qu'il réalise. Le nom de celui qui encaisse figure sur votre facture et sur la page de
              paiement.
            </p>
            <p>
              Assurance responsabilité civile professionnelle : <ACompleter valeur={site.assurance.assureur} libelle="assureur" />
              , contrat n° <ACompleter valeur={site.assurance.numeroContrat} libelle="numéro de contrat" />.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="titre-engagements" className="theme-sombre py-24 md:py-32">
        <div className="conteneur">
          <EnTeteSection id="titre-engagements" surtitre="Nos engagements" titre="Ce que nous vous promettons." />
          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ENGAGEMENTS.map((e) => (
              <li key={e.titre} className="rounded-carte border border-bord bg-texte/[0.03] p-6">
                <h3 className="font-sans text-lg font-bold tracking-normal">{e.titre}</h3>
                <p className="mt-2 text-doux">{e.texte}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="contact" aria-labelledby="titre-contact" className="theme-clair scroll-mt-24 py-24 md:py-32">
        <div className="conteneur">
          <EnTeteSection id="titre-contact" surtitre="Contact" titre="Une question ? Écrivez-nous." />
          <dl className="mt-10 grid gap-5 sm:grid-cols-3">
            <div className="rounded-carte border border-bord bg-blanc p-6 shadow-douce">
              <dt className="text-sm text-doux">Téléphone</dt>
              <dd className="mt-1 font-semibold">
                {telephone ? <a href={telephone}>{site.telephone}</a> : <ACompleter libelle="téléphone" />}
              </dd>
            </div>
            <div className="rounded-carte border border-bord bg-blanc p-6 shadow-douce">
              <dt className="text-sm text-doux">WhatsApp</dt>
              <dd className="mt-1 font-semibold">
                {whatsapp ? (
                  <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                    Nous écrire sur WhatsApp
                  </a>
                ) : (
                  <ACompleter libelle="WhatsApp" />
                )}
              </dd>
            </div>
            <div className="rounded-carte border border-bord bg-blanc p-6 shadow-douce">
              <dt className="text-sm text-doux">E-mail</dt>
              <dd className="mt-1 break-all font-semibold">
                {email ? <a href={email}>{site.email}</a> : <ACompleter libelle="e-mail" />}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <AppelFinal />
    </>
  );
}
