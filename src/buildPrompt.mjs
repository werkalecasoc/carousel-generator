/**
 * Construye el prompt para cada slide.
 *
 * ESTRUCTURA:
 * 1. DIRECTIVA DE ESTILO (del análisis de la imagen de referencia) — máxima prioridad
 * 2. ESPECIFICACIONES DE MARCA (colores, tipografías) — obligatorias
 * 3. CONTENIDO DEL SLIDE (qué texto y elementos incluir) — estructura
 * 4. REGLA DE PERSONAS — siempre al final
 */

const PEOPLE_RULE = `
PEOPLE: If any person appears, they MUST be Caucasian, light/fair skin, European features. No dark or medium-brown skin tones.
`.trim();

export function buildPrompt(slide, config, estiloAnalizado = null) {
  const isPortada = slide.tipo === "portada" || slide.layout === "portada";

  // ── 1. Bloque de estilo ──────────────────────────────────────────────────
  const styleBlock = estiloAnalizado
    ? `GENERATE A COMPLETELY NEW IMAGE. Do NOT copy any existing image. Use the following style as your visual guide:

VISUAL STYLE (from reference — apply this aesthetic exactly):
${estiloAnalizado}`
    : `GENERATE A NEW INSTAGRAM CAROUSEL SLIDE (4:5 portrait, 1080x1350px).`;

  // ── 2. Especificaciones de marca ─────────────────────────────────────────
  const brandBlock = `
MANDATORY BRAND SPECIFICATIONS — apply these exactly, no exceptions:
- BACKGROUND: replicate exactly the background from the style reference above (color, texture, gradient, or image treatment — whatever the reference uses). Do NOT use a plain white background unless the reference has one.
- Primary text color: ${config.paleta?.[0] || "#000000"}
- Accent color 1: ${config.paleta?.[1] || "#888888"}
- Accent color 2: ${config.paleta?.[2] || "#AAAAAA"}
- Title font: ${config.tipografiaTitulos} — use this exact typeface for all titles
- Body font: ${config.tipografiaSubtitulos} — use this exact typeface for body text
${config.marca ? `- Brand name: "${config.marca}" — small elegant text, top center of slide` : "- No brand tag"}`.trim();

  // ── 3. Contenido del slide ───────────────────────────────────────────────
  const contentBlock = isPortada
    ? buildPortadaContent(slide, config)
    : buildInteriorContent(slide, config);

  return [styleBlock, brandBlock, contentBlock, PEOPLE_RULE].join("\n\n");
}

// ─── PORTADA ──────────────────────────────────────────────────────────────────

function buildPortadaContent(slide, config) {
  return `
SLIDE TYPE: Cover / Portada — Instagram carousel (4:5 portrait, 1080x1350px)

CONTENT TO INCLUDE:
- Main title: "${slide.titulo}"
  → Large, dominant text, occupying most of the slide
  → Mix: some words bold upright + 1–2 key words in italic
${slide.subtitulo ? `- Subtitle: "${slide.subtitulo}" — smaller, below title` : ""}
- CTA element: small pill/rounded button at bottom with only "→"

LAYOUT: Title text is the hero. Plenty of breathing room. Clean composition.
No watermarks. No borders.`.trim();
}

// ─── INTERIOR ─────────────────────────────────────────────────────────────────

function buildInteriorContent(slide, config) {
  const layoutInstructions = {
    "mito-verdad":        buildMitoVerdad,
    "texto-imagen":       buildTextoImagen,
    "texto-dos-columnas": buildTextoDosColumnas,
    "texto-producto":     buildTextoProducto,
    "card-oscura":        buildCardOscura,
    "antes-despues":      buildAntesDespues,
    "solo-tipografia":    buildSoloTipografia,
  };

  const builder = layoutInstructions[slide.layout] || buildTextoImagen;
  return builder(slide, config);
}

function buildMitoVerdad(slide, config) {
  return `
SLIDE TYPE: Interior — "Mito vs Verdad" layout (4:5 portrait, 1080x1350px)

CONTENT:
- Top half: Label "MITO" + text "${slide.subtitulo || ""}" — muted, as if being questioned. Optional strikethrough or ❌ icon.
- Divider: thin horizontal line across 80% of slide
- Bottom half: Label "VERDAD" + text "${slide.texto || ""}" — bold, confident, impactful. Highlight numbers/stats.
- CTA pill bottom right: small rounded button with "${slide.ctaTexto || "SWIPE →"}"

LAYOUT: Two-zone vertical split. Strong visual contrast between mito (doubt) and verdad (truth).
No watermarks.`.trim();
}

function buildTextoImagen(slide, config) {
  return `
SLIDE TYPE: Interior — text top, image bottom (4:5 portrait, 1080x1350px)

CONTENT:
- Title: "${slide.titulo}" — large, left-aligned, upper third of slide
${slide.subtitulo ? `- Subtitle: "${slide.subtitulo}" — italic, medium size, below title` : ""}
${slide.texto ? `- Body text: "${slide.texto}" — small, below subtitle` : ""}
- One editorial photograph in a rounded-corner card occupying bottom 50% of slide
- Small decorative curved arrow pointing at a key element
- CTA pill bottom right: small rounded button with "→"

LAYOUT: Typography top, image card bottom. Airy spacing.
No watermarks.`.trim();
}

function buildTextoDosColumnas(slide, config) {
  return `
SLIDE TYPE: Interior — text top, two images below (4:5 portrait, 1080x1350px)

CONTENT:
- Title: "${slide.titulo}" — large, left-aligned
${slide.subtitulo ? `- Subtitle: "${slide.subtitulo}" — italic, below title` : ""}
- Two rounded-corner photograph cards side by side in bottom half (left slightly taller, right offset lower)
- Small decorative curved arrow
- CTA pill bottom right: "→"

LAYOUT: Title area top, two image cards below. Clean premium.
No watermarks.`.trim();
}

function buildTextoProducto(slide, config) {
  return `
SLIDE TYPE: Interior — text + centered product/object (4:5 portrait, 1080x1350px)

CONTENT:
- Title: "${slide.titulo}" — large, top left
${slide.subtitulo ? `- Subtitle: "${slide.subtitulo}" — smaller, near title` : ""}
${slide.texto ? `- Body: "${slide.texto}" — small, below title` : ""}
- One large product/object/subject centered, floating naturally on the background (no card frame)
- CTA pill bottom right: "→"

LAYOUT: Text top-left, subject centered with maximum breathing room.
No watermarks.`.trim();
}

function buildCardOscura(slide, config) {
  return `
SLIDE TYPE: Interior — dark card hero (4:5 portrait, 1080x1350px)

CONTENT:
- Large dark rounded rectangle card (dark color, ~80% width, ~55% height, centered)
  Inside: Title "${slide.titulo}" — large, white text
  ${slide.subtitulo ? `Inside: Subtitle "${slide.subtitulo}" — italic, white, below title` : ""}
- Small accent photograph card bottom-right, partially overlapping the dark card
- CTA pill: "→"

LAYOUT: Dark card as hero with cream background surround. Layered depth.
No watermarks.`.trim();
}

function buildAntesDespues(slide, config) {
  return `
SLIDE TYPE: Interior — before/after comparison (4:5 portrait, 1080x1350px)

CONTENT:
- Title: "${slide.titulo}" — large, top
${slide.subtitulo ? `- Subtitle: "${slide.subtitulo}" — italic, below title` : ""}
- Two rounded-corner cards side by side:
  LEFT: "before" state — smaller, less polished
  CENTER: small arrow →
  RIGHT: "after" state — larger, premium
${slide.texto ? `- Small annotation: "${slide.texto}"` : ""}
- CTA pill: "→"

LAYOUT: Clear visual contrast between before and after.
No watermarks.`.trim();
}

function buildSoloTipografia(slide, config) {
  return `
SLIDE TYPE: Interior — typography only, no photographs (4:5 portrait, 1080x1350px)

CONTENT:
- Title: "${slide.titulo}" — massive, dominant, left-aligned, occupies most of slide
  Mix: bold upright for most words + italic for 1–2 emphasis words per line
${slide.subtitulo ? `- Subtitle: "${slide.subtitulo}" — smaller italic, below title` : ""}
${slide.texto ? `- Body: "${slide.texto}" — small, below` : ""}
- Small decorative curved arrow
- CTA pill: "→"

LAYOUT: Typography IS the only visual. No photos. Maximum breathing room.
No watermarks.`.trim();
}
