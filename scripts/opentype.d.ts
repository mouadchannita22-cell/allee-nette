// opentype.js 2.0 ne publie pas ses types : déclaration minimale pour scripts/generer-logo.ts.
declare module "opentype.js" {
  type Commande = { type: string; x?: number; y?: number; x1?: number; y1?: number; x2?: number; y2?: number };
  type Boite = { x1: number; y1: number; x2: number; y2: number };
  type Chemin = { commands: Commande[]; getBoundingBox(): Boite };
  type Glyphe = { advanceWidth?: number; getBoundingBox(): Boite; getPath(x: number, y: number, taille: number): Chemin };
  type Police = {
    unitsPerEm: number;
    ascender: number;
    tables: { os2?: { sxHeight?: number } };
    getPath(texte: string, x: number, y: number, taille: number, options?: { kerning?: boolean }): Chemin;
    stringToGlyphs(texte: string): Glyphe[];
    charToGlyph(caractere: string): Glyphe;
    getKerningValue(gauche: Glyphe, droite: Glyphe): number;
  };
  const opentype: { parse(donnees: ArrayBufferLike): Police };
  export default opentype;
}
