/**
 * Construye el prompt de imagen para cada slide.
 *
 * PORTADA: foto editorial full-bleed + tipografía masiva superpuesta
 * INTERIOR: fondo crema limpio, múltiples layouts según el tipo de slide
 */

// Instrucción global que se aplica a TODOS los prompts sin excepción
const PEOPLE_RULE = `
MANDATORY RULE — APPLIES REGARDLESS OF REFERENCE IMAGE:
If any person appears in the image (model, subject, portrait, background figure), they MUST be:
- Caucasian ethnicity, light/fair skin tone
- European features
- Can be blonde, brunette with light skin, or redhead — all light-skinned
- Well-groomed, professional appearance
This rule overrides any reference image. Do NOT generate people with dark or medium-brown skin tones.
`.trim();

export function buildPrompt(slide, config, estiloAnalizado = null) {
  const base = slide.tipo === "portada" || slide.layout === "portada"
    ? buildPortadaPrompt(slide, config)
    : buildInteriorPrompt(slide, config);

  // Bloque de estilo analizado de la imagen de referencia
  const estiloBlock = estiloAnalizado ? `
REFERENCE STYLE ANALYSIS (extracted from the uploaded reference image — apply this style exactly):
${estiloAnalizado}

IMPORTANT: Adapt the above style to use these specific brand colors and fonts:
- Colors: ${config.paleta?.join(", ")}
- Title font: ${config.tipografiaTitulos}
- Body font: ${config.tipografiaSubtitulos}
The composition, mood, lighting and layout must match the reference style. Colors and typography must match the brand config.
`.trim() : "";

  return [base, estiloBlock, PEOPLE_RULE].filter(Boolean).join("\n\n");
}

// ─── PORTADA ─────────────────────────────────────────────────────────────────

function buildPortadaPrompt(slide, config) {
  const { tipografiaTitulos, tipografiaSubtitulos } = config;

  return `
Create a cover slide for an Instagram carousel (square 1:1, 1080x1080px).

VISUAL STYLE — replicate the reference image style exactly:
- Full-bleed editorial photograph fills 100% of the frame, no margins
- Close-up portrait, flat lay, or editorial hero shot
- High-contrast cinematic lighting, moody and premium
- Feels like a high-end fashion or editorial magazine cover

TYPOGRAPHY — large text overlaid directly on the photo:
- TITLE: "${slide.titulo}"
  Font: ${tipografiaTitulos}, massive size (80–120pt), white (#FFFFFF)
  Placement: lower 40–60% of slide, left-aligned or centered
  Mix: bold upright for most words + italic serif for 1–2 emphasis words
- SUBTITLE: "${slide.subtitulo || ""}"
  Font: ${tipografiaSubtitulos}, medium size, white, below title

CTA PILL — bottom center:
  Small white pill/rounded rectangle containing only a "→" arrow. No other text.

BRAND TAG — top center:
  Text "Werkalec" in small elegant lettering, white, centered at top

Rules: no borders, no gradients added artificially, no watermarks.
The photograph IS the background.
`.trim();
}

// ─── INTERIOR — dispatcher ───────────────────────────────────────────────────

function buildInteriorPrompt(slide, config) {
  // Colores de marca si están en la paleta, o defaults
  const [primary, camel, gold, bg] = config.paleta || ["#341600", "#c7a278", "#ffbd59", "#FFF8F0"];

  const base = {
    bg:     bg     || "#FFF8F0",   // fondo claro cálido
    text:   primary || "#341600",  // marrón oscuro principal
    camel:  camel   || "#c7a278",  // acento camel
    gold:   gold    || "#ffbd59",  // acento dorado
    accent: camel   || "#c7a278",  // flechas decorativas
  };

  const layoutBuilders = {
    "mito-verdad":        buildMitoVerdad,
    "texto-imagen":       buildTextoImagen,
    "texto-dos-columnas": buildTextoDosColumnas,
    "texto-producto":     buildTextoProducto,
    "card-oscura":        buildCardOscura,
    "antes-despues":      buildAntesDespues,
    "solo-tipografia":    buildSoloTipografia,
  };

  const builder = layoutBuilders[slide.layout] || buildTextoImagen;
  return builder(slide, config, base);
}

// ─── LAYOUTS INTERIORES ──────────────────────────────────────────────────────

const brandTag = (textColor) =>
  `BRAND TAG top center: text "Werkalec" in small elegant lettering, color: ${textColor}, centered at the top`;

const ctaPill = () =>
  `CTA PILL bottom right: small white rounded rectangle (pill shape), containing only a single arrow "→", dark color inside. No other text.`;

const decorativeArrow = (color) =>
  `DECORATIVE ELEMENT: one thin hand-drawn curved arrow, color ${color} at 40% opacity, placed naturally to point at a key element`;

// 0. MITO / VERDAD — layout especial para carruseles de desmitificación
function buildMitoVerdad(slide, config, c) {
  const { tipografiaTitulos, tipografiaSubtitulos } = config;
  const mitoText = slide.subtitulo || "";
  const verdadText = slide.texto || "";

  return `
Create an interior carousel slide (4:5 portrait, 1080x1350px). Premium editorial style.

BACKGROUND: solid warm light tone (${c.bg}), clean and airy.

BRAND TAG top center: small 2–3 line all-caps bold label in ${c.text}.

LAYOUT — two-zone vertical split: MITO on top, VERDAD below:

ZONE 1 — MITO (top ~50% of slide):
- Label: "MITO ${slide.titulo.replace("MITO ", "")}" — ${tipografiaTitulos}, small caps or bold, color ${c.camel}, ~22pt, top left
- Mito text: ${mitoText}
  Font: ${tipografiaTitulos} italic, large (42–52pt), color ${c.text}
  Style: slightly faded or muted — as if being questioned
  Optional: a thin diagonal line through the text OR a subtle ❌ icon in ${c.camel} next to it

DIVIDER: thin horizontal line in ${c.camel} at 50% height, width 80%, centered

ZONE 2 — VERDAD (bottom ~45% of slide):
- Label: "VERDAD" — ${tipografiaSubtitulos}, bold, uppercase, color ${c.gold}, ~18pt
- Verdad text: ${verdadText}
  Font: ${tipografiaTitulos} bold, large (38–46pt), color ${c.text}
  Style: strong, confident, full weight — the truth lands with impact
  Optional: a ✓ checkmark icon or subtle highlight in ${c.gold} behind the key stat/number

CTA PILL bottom right: white rounded rectangle, text: "${slide.ctaTexto || "SWIPE →"}" in ${tipografiaSubtitulos} small caps.

IMPORTANT:
- The contrast between MITO (muted/questioned) and VERDAD (bold/affirmed) is the whole point
- Numbers and percentages in the verdad should be visually emphasized (larger, bold, color ${c.gold})
- No watermarks. Clean premium layout. Lots of breathing room.
`.trim();
}

// 1. Texto arriba + imagen full width abajo
function buildTextoImagen(slide, config, c) {
  const { tipografiaTitulos, tipografiaSubtitulos } = config;
  return `
Create an interior carousel slide (4:5 portrait, 1080x1350px). Match the reference image style exactly.

BACKGROUND: solid warm cream (${c.bg}), clean, airy, no texture.

${brandTag(c.text)}

LAYOUT — top half: typography, bottom half: image card
- TOP: Title "${slide.titulo}" — ${tipografiaTitulos}, very large (60–80pt), ${c.text}, left-aligned, upper 35% of slide
  ${slide.subtitulo ? `Below title: "${slide.subtitulo}" — ${tipografiaSubtitulos} italic, medium size, ${c.text}` : ""}
  ${slide.texto ? `Small body text: "${slide.texto}" — ${tipografiaSubtitulos}, ~20pt, ${c.text}` : ""}
- BOTTOM: One editorial photograph in a rounded-corner card (border-radius ~20px), wide, occupying bottom 50% of slide

${decorativeArrow(c.accent)}
${ctaPill()}

Typography mixes bold upright + italic serif on key emphasis words.
No watermarks. Max 3 visual elements. Lots of breathing room.
`.trim();
}

// 2. Texto arriba + dos imágenes lado a lado
function buildTextoDosColumnas(slide, config, c) {
  const { tipografiaTitulos, tipografiaSubtitulos } = config;
  return `
Create an interior carousel slide (4:5 portrait, 1080x1350px). Match the reference image style exactly.

BACKGROUND: solid warm cream (${c.bg}), airy.

${brandTag(c.text)}

LAYOUT — two column images below the title:
- TOP: Title "${slide.titulo}" — ${tipografiaTitulos}, large (50–70pt), ${c.text}, left-aligned
  ${slide.subtitulo ? `Subtitle: "${slide.subtitulo}" — ${tipografiaSubtitulos} italic, ${c.text}` : ""}
- BOTTOM: Two rounded-corner photograph cards side by side (each ~45% width, portrait aspect, border-radius ~16px)
  Left card: slightly taller
  Right card: slightly shorter, offset lower

${decorativeArrow(c.accent)}
${ctaPill()}

Typography mixes bold upright + italic serif.
No watermarks. Clean and premium.
`.trim();
}

// 3. Texto top-left + producto grande centrado
function buildTextoProducto(slide, config, c) {
  const { tipografiaTitulos, tipografiaSubtitulos } = config;
  return `
Create an interior carousel slide (4:5 portrait, 1080x1350px). Match the reference image style exactly.

BACKGROUND: solid warm cream (${c.bg}), airy.

${brandTag(c.text)}

LAYOUT — title top, large product/object centered with breathing room:
- TOP LEFT: Title "${slide.titulo}" — ${tipografiaTitulos}, large (55–75pt), ${c.text}
  ${slide.subtitulo ? `Right of title or below: "${slide.subtitulo}" — ${tipografiaSubtitulos}, smaller, ${c.text}` : ""}
- CENTER/LOWER: One large product, object, or subject placed centrally, NO card frame, floats on the cream background naturally
  The subject should feel like it's sitting on or floating in the cream space

${slide.texto ? `SMALL BODY TEXT: "${slide.texto}" — ${tipografiaSubtitulos}, ~18pt, ${c.text}, left-aligned below title` : ""}
${ctaPill()}

Typography mixes bold upright + italic serif.
No watermarks. Maximum breathing space.
`.trim();
}

// 4. Card oscura redondeada con texto blanco
function buildCardOscura(slide, config, c) {
  const { tipografiaTitulos, tipografiaSubtitulos } = config;
  const darkCard = "#2C1A14";
  return `
Create an interior carousel slide (4:5 portrait, 1080x1350px). Match the reference image style exactly.

BACKGROUND: solid warm cream (${c.bg}).

${brandTag(c.text)}

LAYOUT — dark card as hero + small accent image:
- MAIN ELEMENT: Large dark rounded rectangle card (color ${darkCard}, border-radius ~20px, ~80% width, ~55% height)
  Centered vertically in the slide
  Inside the card, centered text:
    Title: "${slide.titulo}" — ${tipografiaTitulos}, large (45–60pt), white (#FFFFFF)
    ${slide.subtitulo ? `Subtitle: "${slide.subtitulo}" — ${tipografiaSubtitulos} italic, white, below title` : ""}
  Typography mixes bold upright + italic serif
- ACCENT: Small rounded photograph card (border-radius ~12px) placed bottom-right, partially overlapping the dark card
- TOP: Optional small rounded UI card or element placed top-left, also partially overlapping
- Thin curved line connecting the elements (like a path/flow)

${ctaPill()}
No watermarks.
`.trim();
}

// 5. Antes/después con flecha
function buildAntesDespues(slide, config, c) {
  const { tipografiaTitulos, tipografiaSubtitulos } = config;
  return `
Create an interior carousel slide (4:5 portrait, 1080x1350px). Match the reference image style exactly.

BACKGROUND: solid warm cream (${c.bg}), airy.

${brandTag(c.text)}

LAYOUT — before/after comparison:
- TOP: Title "${slide.titulo}" — ${tipografiaTitulos}, large (55–70pt), ${c.text}, left-aligned
  ${slide.subtitulo ? `Subtitle: "${slide.subtitulo}" — ${tipografiaSubtitulos} italic, ${c.text}` : ""}
- BOTTOM: Two rounded-corner cards showing before → after:
  LEFT card: "before" state (smaller, slightly grayed or less polished)
  CENTER: Small warm-colored arrow → pointing right
  RIGHT card: "after" state (larger, polished, premium)
${slide.texto ? `Small annotation text near relevant card: "${slide.texto}" — ${tipografiaSubtitulos}, ~16pt` : ""}

${decorativeArrow(c.accent)}
${ctaPill()}

No watermarks. Clean premium layout.
`.trim();
}

// 6. Solo tipografía — frase de impacto
function buildSoloTipografia(slide, config, c) {
  const { tipografiaTitulos, tipografiaSubtitulos } = config;
  return `
Create an interior carousel slide (4:5 portrait, 1080x1350px). Match the reference image style exactly.

BACKGROUND: solid warm cream (${c.bg}), airy.

${brandTag(c.text)}

LAYOUT — typography is the only hero, no photographs:
- TITLE: "${slide.titulo}"
  Font: ${tipografiaTitulos}, massive (70–100pt), ${c.text}
  Placement: left-aligned, occupies most of the slide
  Typography mixes bold upright + italic serif on emphasis words (1–2 words per line in italic)
${slide.subtitulo ? `- SUBTITLE: "${slide.subtitulo}" — ${tipografiaSubtitulos} italic, smaller, ${c.text}, below title` : ""}
${slide.texto ? `- BODY: "${slide.texto}" — ${tipografiaSubtitulos}, ~20pt, ${c.text}` : ""}

${decorativeArrow(c.accent)}
${ctaPill()}

No images. Maximum breathing space. Typography carries everything.
No watermarks.
`.trim();
}
