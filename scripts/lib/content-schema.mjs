// Strict JSON schema for the article structure produced by gpt-5.6-terra.
// Rich, typed content blocks so the front-end can render highlights, tables,
// FAQ and 2-column comparisons with a consistent design system.

const strObj = (props, required) => ({
  type: 'object',
  properties: props,
  required: required ?? Object.keys(props),
  additionalProperties: false,
});

const proseBlock = strObj({
  type: { type: 'string', enum: ['prose'] },
  heading: { type: 'string', description: 'Titre de section (H2). "" si aucun.' },
  html: {
    type: 'string',
    description:
      'Paragraphes riches en HTML. Balises autorisées: <p>, <strong>, <em>, <ul>/<ol>/<li>, <a href>. 2 à 5 paragraphes.',
  },
});

const keyPointsBlock = strObj({
  type: { type: 'string', enum: ['key_points'] },
  heading: { type: 'string' },
  points: { type: 'array', items: { type: 'string' }, description: '3 à 6 points clés concis.' },
});

const calloutBlock = strObj({
  type: { type: 'string', enum: ['callout'] },
  variant: { type: 'string', enum: ['tip', 'info', 'warning', 'love'] },
  title: { type: 'string' },
  html: { type: 'string', description: 'Contenu de l’encadré en HTML simple.' },
});

const tableBlock = strObj({
  type: { type: 'string', enum: ['table'] },
  heading: { type: 'string' },
  intro: { type: 'string', description: 'Phrase d’introduction du tableau. "" si aucune.' },
  columns: { type: 'array', items: { type: 'string' }, description: '2 à 4 en-têtes de colonnes.' },
  rows: {
    type: 'array',
    items: { type: 'array', items: { type: 'string' } },
    description: 'Chaque ligne = un tableau de cellules alignées sur columns.',
  },
  note: { type: 'string', description: 'Note/source sous le tableau. "" si aucune.' },
});

const comparisonBlock = strObj({
  type: { type: 'string', enum: ['comparison'] },
  heading: { type: 'string' },
  intro: { type: 'string' },
  left: strObj({
    title: { type: 'string' },
    points: { type: 'array', items: { type: 'string' } },
  }),
  right: strObj({
    title: { type: 'string' },
    points: { type: 'array', items: { type: 'string' } },
  }),
});

const stepsBlock = strObj({
  type: { type: 'string', enum: ['steps'] },
  heading: { type: 'string' },
  intro: { type: 'string' },
  steps: {
    type: 'array',
    items: strObj({ title: { type: 'string' }, html: { type: 'string' } }),
  },
});

const statsBlock = strObj({
  type: { type: 'string', enum: ['stats'] },
  heading: { type: 'string' },
  items: {
    type: 'array',
    items: strObj({ value: { type: 'string' }, label: { type: 'string' } }),
  },
});

const quoteBlock = strObj({
  type: { type: 'string', enum: ['quote'] },
  text: { type: 'string' },
  author: { type: 'string', description: 'Attribution ou "" si générique.' },
});

export const ARTICLE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'title',
    'meta_description',
    'reading_time_min',
    'hero_intro',
    'toc',
    'sections',
    'faq',
    'conclusion_html',
    'key_takeaways',
  ],
  properties: {
    title: { type: 'string', description: 'Titre H1 optimisé (peut affiner l’original, même intention/sujet).' },
    meta_description: { type: 'string', description: 'Meta description SEO, 140–160 caractères, incitative.' },
    reading_time_min: { type: 'integer', description: 'Temps de lecture estimé en minutes.' },
    hero_intro: {
      type: 'string',
      description: 'Chapô d’introduction accrocheur (2–4 phrases), sans balise HTML.',
    },
    key_takeaways: {
      type: 'array',
      items: { type: 'string' },
      description: '3 à 5 enseignements essentiels (encadré "L’essentiel").',
    },
    toc: {
      type: 'array',
      items: { type: 'string' },
      description: 'Sommaire: titres des sections principales dans l’ordre.',
    },
    sections: {
      type: 'array',
      description:
        'Corps de l’article: 6 à 12 blocs. Alterner prose et blocs visuels. Inclure AU MOINS un tableau et, si pertinent, une comparaison 2 colonnes, des encadrés et des étapes.',
      items: {
        anyOf: [
          proseBlock,
          keyPointsBlock,
          calloutBlock,
          tableBlock,
          comparisonBlock,
          stepsBlock,
          statsBlock,
          quoteBlock,
        ],
      },
    },
    faq: {
      type: 'array',
      description: '4 à 7 questions/réponses répondant aux intentions de recherche associées.',
      items: strObj({
        q: { type: 'string' },
        a_html: { type: 'string', description: 'Réponse en HTML simple (1–3 paragraphes).' },
      }),
    },
    conclusion_html: { type: 'string', description: 'Conclusion synthétique et engageante en HTML.' },
  },
};

export const ARTICLE_FORMAT = {
  type: 'json_schema',
  name: 'article',
  strict: true,
  schema: ARTICLE_SCHEMA,
};
