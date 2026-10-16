/**
 * Shaders du héros « pare-brise », écrits pour Allée Nette (GLSL ES 3.0).
 *
 * Trois passes plein écran :
 * 1. `generationVitre` (une seule fois) : saleté procédurale et perles d'eau
 *    figées dans une texture (normales en RG, perle en B, poussière en A) ;
 * 2. `masque` (à chaque image, en ping-pong) : ce qui a été essuyé, qui se
 *    resalit lentement ;
 * 3. `composition` : la scène 3D vue à travers la vitre (réfraction des
 *    gouttes, buée, poussière), puis tonalité et espace colorimétrique.
 *
 * Coordonnées « p » : x multiplié par le rapport largeur/hauteur, y vers le
 * haut, 1 unité = la hauteur de l'écran. Les formes restent rondes à tout format.
 */

export const sommetPleinEcran = /* glsl */ `
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const bruit = /* glsl */ `
// Hachage entier PCG (Jarzynski et Olano, 2020).
uint pcg(uint v) {
  uint etat = v * 747796405u + 2891336453u;
  uint mot = ((etat >> ((etat >> 28u) + 4u)) ^ etat) * 277803737u;
  return (mot >> 22u) ^ mot;
}
float hasard(vec2 p) {
  uvec2 q = uvec2(ivec2(floor(p)) + 65536);
  return float(pcg(q.x + pcg(q.y))) / 4294967295.0;
}
float hasard1(float x) {
  return float(pcg(uint(int(floor(x)) + 65536))) / 4294967295.0;
}
vec2 hasard2(vec2 p) {
  return vec2(hasard(p), hasard(p + 101.0));
}
float bruitValeur(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hasard(i), hasard(i + vec2(1.0, 0.0)), u.x),
             mix(hasard(i + vec2(0.0, 1.0)), hasard(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float somme = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    somme += amplitude * bruitValeur(p);
    p = p * 2.03 + vec2(17.1, 9.7);
    amplitude *= 0.5;
  }
  return somme;
}
`;

/** Une couche de perles d'eau posées sur une grille (cellules de taille 1/densite). */
const perles = /* glsl */ `
// Retourne (normale.xy, opacité) de la perle de la cellule contenant p.
vec3 couchePerles(vec2 p, float densite, float presence, float rMin, float rMax, float graine) {
  vec2 cellule = floor(p * densite);
  vec2 f = fract(p * densite);
  float h = hasard(cellule + graine);
  if (h > presence) return vec3(0.0);
  float r = mix(rMin, rMax, hasard(cellule + graine + 7.0));
  vec2 centre = r + (1.0 - 2.0 * r) * hasard2(cellule + graine + 13.0);
  // Légèrement allongée vers le bas : la gravité.
  vec2 d = (f - centre) / r;
  d.y *= 0.88;
  float l = length(d);
  float a = smoothstep(1.0, 0.72, l);
  return vec3(d * a, a);
}
`;

export const generationVitre = /* glsl */ `
precision highp float;
in vec2 vUv;
${bruit}
${perles}
void main() {
  // La texture couvre 2 unités de large sur 1 de haut.
  vec2 p = vUv * vec2(2.0, 1.0);

  vec3 fines = couchePerles(p, 95.0, 0.38, 0.1, 0.26, 0.0);
  vec3 moyennes = couchePerles(p, 34.0, 0.42, 0.14, 0.34, 31.0);
  vec3 grosses = couchePerles(p, 13.0, 0.3, 0.16, 0.36, 77.0);
  vec3 perle = fines;
  if (moyennes.z > perle.z) perle = moyennes;
  if (grosses.z > perle.z) perle = grosses;

  // Poussière : nappes, grain fin, traces d'anciens essuyages en arcs, piqûres.
  float nappes = smoothstep(0.28, 0.78, fbm(p * 2.6));
  float grain = fbm(p * 38.0);
  vec2 pivot = vec2(1.0, -0.55);
  float arcs = 0.5 + 0.5 * sin(length(p - pivot) * 85.0 + fbm(p * 4.0) * 6.0);
  float piqures = step(0.992, hasard(floor(p * 260.0)));
  float poussiere = 0.42 + 0.38 * nappes + 0.14 * (grain - 0.5) + 0.1 * arcs * nappes + 0.25 * piqures;

  gl_FragColor = vec4(perle.xy * 0.5 + 0.5, perle.z, clamp(poussiere, 0.0, 1.0));
}
`;

export const masque = /* glsl */ `
precision highp float;
in vec2 vUv;
uniform sampler2D tPrecedent;
uniform float uDt;
uniform float uDureeResalissement;
uniform float uAspect;
uniform float uGraine;
uniform int uNbSegments;
uniform vec4 uSegments[6];
uniform float uRayons[6];
${bruit}
float distanceSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}
void main() {
  float propre = texture(tPrecedent, vUv).r;
  // Se resalit lentement. Le tramage aléatoire conserve la vitesse moyenne
  // malgré la précision de 8 bits de la texture.
  propre -= uDt / uDureeResalissement + (hasard(vUv * 2048.0 + uGraine) - 0.5) / 255.0;

  vec2 p = vec2(vUv.x * uAspect, vUv.y);
  for (int i = 0; i < 6; i++) {
    if (i >= uNbSegments) break;
    vec4 s = uSegments[i];
    float d = distanceSegment(p, s.xy, s.zw);
    // Bord irrégulier, comme une microfibre.
    float bord = uRayons[i] * (0.8 + 0.2 * bruitValeur(p * 38.0 + float(i) * 11.0));
    propre = max(propre, 1.0 - smoothstep(bord * 0.62, bord, d));
  }
  gl_FragColor = vec4(clamp(propre, 0.0, 1.0), 0.0, 0.0, 1.0);
}
`;

export const composition = /* glsl */ `
precision highp float;
in vec2 vUv;
uniform sampler2D tScene;
uniform sampler2D tMasque;
uniform sampler2D tVitre;
uniform float uTemps;
uniform float uAspect;
uniform float uApparition;
uniform vec3 uFondHaut;
uniform vec3 uFondBas;
uniform vec3 uLueur;
uniform vec2 uCentreLueur;
${bruit}

// Une goutte qui glisse par colonne (quand la colonne en a une), avec sa traînée.
vec3 gouttesGlissantes(vec2 p, float t, float colonnes, float graine) {
  float colonne = floor(p.x * colonnes);
  float h1 = hasard1(colonne + graine);
  if (h1 > 0.5) return vec3(0.0);
  float h2 = hasard1(colonne + graine + 17.0);
  float h3 = hasard1(colonne + graine + 41.0);
  float vitesse = 0.03 + 0.05 * h3;
  float cycle = 1.7;
  float y0 = 1.25 - mod(t * vitesse + h2 * cycle, cycle);
  float x = (colonne + 0.3 + 0.4 * h2) / colonnes
    + sin(p.y * 21.0 + colonne * 3.1) * 0.0035
    + sin(p.y * 6.5 + h1 * 9.0) * 0.005;
  float rayon = 0.0085 + 0.012 * h1;

  vec2 d = vec2(p.x - x, (p.y - y0) * 0.78) / rayon;
  float a = smoothstep(1.0, 0.7, length(d));
  vec2 n = d * a;

  float dessus = p.y - y0;
  if (dessus > rayon && dessus < 0.22) {
    float pas = 0.016;
    float k = floor(dessus / pas);
    float rk = rayon * 0.42 * (1.0 - dessus / 0.22) * step(0.3, hasard1(colonne * 13.0 + k + graine));
    if (rk > 0.0) {
      vec2 dk = vec2(p.x - x, p.y - (y0 + (k + 0.5) * pas)) / rk;
      float ak = smoothstep(1.0, 0.6, length(dk));
      if (ak > a) {
        a = ak;
        n = dk * ak;
      }
    }
  }
  return vec3(n, a);
}

void main() {
  vec2 uv = vUv;
  vec2 p = vec2(uv.x * uAspect, uv.y);
  float propre = texture(tMasque, uv).r;
  float sale = 1.0 - propre;

  vec4 vitre = texture(tVitre, vec2(0.5 + (uv.x - 0.5) * uAspect * 0.5, uv.y));
  vec2 nPerle = (vitre.rg * 2.0 - 1.0);
  float aPerle = vitre.b * smoothstep(0.15, 0.85, sale);

  vec3 g1 = gouttesGlissantes(p, uTemps, 9.0, 3.0);
  vec3 g2 = gouttesGlissantes(p + vec2(0.037, 0.0), uTemps * 1.3, 15.0, 71.0);
  vec3 g = g1.z > g2.z ? g1 : g2;

  vec2 n = nPerle * aPerle + g.xy;
  float a = max(aPerle, g.z);

  // Réfraction : chaque goutte agit comme une petite lentille.
  vec2 uvR = uv - n * vec2(0.03 / uAspect, 0.03);
  float flou = mix(0.0, 4.2, sale) + a * 1.5;
  vec4 net = texture(tScene, uvR);
  vec4 trouble = textureLod(tScene, uvR, flou);
  vec4 sceneVue = mix(net, trouble, clamp(sale * 0.92 + a * 0.5, 0.0, 1.0));

  // Fond de nuit, avec une lueur aqua derrière la voiture.
  vec3 fond = mix(uFondBas, uFondHaut, smoothstep(0.0, 1.0, uv.y));
  vec2 dl = (p - vec2(uCentreLueur.x * uAspect, uCentreLueur.y)) * vec2(0.8, 1.3);
  fond += uLueur * exp(-dot(dl, dl) * 2.6);
  vec3 couleur = sceneVue.rgb + fond * (1.0 - sceneVue.a);

  // Poussière éclairée par la lumière qui traverse la vitre.
  float lum = dot(trouble.rgb + fond * (1.0 - trouble.a), vec3(0.2126, 0.7152, 0.0722));
  vec3 teinte = mix(vec3(0.045, 0.05, 0.058), vec3(0.12, 0.112, 0.1), vitre.a);
  vec3 couleurPoussiere = teinte * (0.8 + 2.6 * lum);
  couleur = mix(couleur, couleurPoussiere, vitre.a * sale * 0.82);

  // Éclat et ombre des gouttes.
  vec3 normale = normalize(vec3(n * 1.8, 1.0));
  float eclat = pow(max(dot(normale, normalize(vec3(-0.45, 0.65, 0.62))), 0.0), 60.0) * a;
  couleur += eclat * vec3(0.07, 0.11, 0.12);
  couleur *= 1.0 - 0.3 * a * smoothstep(0.55, 1.0, length(n));

  // Reflet très doux de la vitre, en diagonale.
  couleur += vec3(0.012, 0.02, 0.024) * smoothstep(0.6, 0.0, abs(uv.x - uv.y * 0.6 - 0.25)) * (0.5 + 0.5 * sale);

  gl_FragColor = vec4(couleur * uApparition, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
