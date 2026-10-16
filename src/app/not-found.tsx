import { Bouton } from "@/components/ui/Bouton";

export default function PageIntrouvable() {
  return (
    <section className="theme-sombre flex min-h-[80svh] items-center">
      <div className="conteneur pt-28">
        <p className="font-titre text-sm font-bold text-accent">Erreur 404</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-extrabold md:text-6xl">Cette page est partie au lavage.</h1>
        <p className="mt-5 max-w-xl text-lg text-doux">Elle n'existe pas, ou plus. Le reste du site vous attend.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Bouton href="/">Retour à l'accueil</Bouton>
          <Bouton href="/tarifs" variante="secondaire">
            Voir les tarifs
          </Bouton>
        </div>
      </div>
    </section>
  );
}
