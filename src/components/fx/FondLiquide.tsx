/**
 * Fond « liquide » derrière le calculateur : trois nappes de couleur floues
 * qui dérivent lentement. Seules des transformations sont animées (le flou
 * est calculé une fois) : coût négligeable. Immobile en mouvement réduit.
 */
export function FondLiquide() {
  return (
    <div aria-hidden="true" className="fond-liquide pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <span className="nappe nappe-1" />
      <span className="nappe nappe-2" />
      <span className="nappe nappe-3" />
    </div>
  );
}
