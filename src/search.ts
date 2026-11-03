// Keyword matching for find_relevant_work. It reports which terms overlap and
// nothing else: no scores, no ranking numbers, no judgement of fit.

import type { Resume } from "./resume.js";

const STOPWORDS = new Set(
  `a an and are as at be been but by can do for from has have how i if in into is it its
  of on or our that the their them they this to was we were what when where which who will
  with you your about any also some such than then there these those via per using use used
  me my him his he she her us all more most other own same so too very just should would could
  job role roles position candidate candidates looking seeking hire hiring team teams company
  work working worked experience experienced years year strong ability able skills skill
  knowledge required requirements preferred plus must nice good great excellent familiarity
  familiar understanding responsibilities responsible including include etc e g ie eg new
  build building built kauntey acharya`.split(/\s+/),
);

// Multi-word phrases and abbreviations folded to the token used in resume.json.
const PHRASES: [RegExp, string][] = [
  [/retrieval[\s-]+augmented[\s-]+generation/g, " rag "],
  [/large[\s-]+language[\s-]+models?/g, " llm "],
  [/machine[\s-]+learning/g, " ml machine learning "],
  [/general[\s-]+relativity/g, " gr general relativity "],
  [/gen[\s-]?ai|generative[\s-]+ai/g, " llm ai "],
  [/postgresql/g, " postgres "],
  [/time[\s-]+series/g, " timeseries "],
  [/\bai[\s-]+agents?\b/g, " agent agentic "],
];

const ALIASES: Record<string, string> = {
  llms: "llm",
  agents: "agent",
  timeseries: "time-series",
};

export function tokenize(text: string): string[] {
  let t = ` ${text.toLowerCase()} `;
  for (const [re, rep] of PHRASES) t = t.replace(re, rep);
  const out = new Set<string>();
  for (const raw of t.split(/[^a-z0-9+#.-]+/)) {
    let tok = raw.replace(/^[.-]+|[.-]+$/g, "");
    tok = ALIASES[tok] ?? tok;
    if (tok === "time-series") {
      out.add("time").add("series");
      continue;
    }
    if (tok.length < 2 || STOPWORDS.has(tok) || /^\d+$/.test(tok)) continue;
    out.add(tok);
  }
  return [...out];
}

// Word endings that turn one form into another (agent/agentic, model/modelling).
// Keeps "under" from matching "underwater".
const SUFFIX = /^(s|es|ed|er|ers|ic|ics|al|ally|ly|ing|ling|ion|ions|ation|ations|ence|ment|ments|ity)$/;

/** Exact match, the same word with a common ending, or a shared 6-letter stem (evaluate/evaluation). */
function termsMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (short.length >= 3 && long.startsWith(short) && SUFFIX.test(long.slice(short.length))) return true;
  return short.length >= 7 && long.slice(0, 6) === short.slice(0, 6);
}

function overlap(queryTerms: string[], text: string): string[] {
  const docTerms = tokenize(text);
  return queryTerms.filter((q) => docTerms.some((d) => termsMatch(q, d)));
}

function rank<T>(items: T[] | undefined, toText: (item: T) => string, terms: string[], limit: number) {
  return (items ?? [])
    .map((item) => ({ item, matchedTerms: overlap(terms, toText(item)) }))
    .filter((r) => r.matchedTerms.length > 0)
    .sort((a, b) => b.matchedTerms.length - a.matchedTerms.length)
    .slice(0, limit)
    .map(({ item, matchedTerms }) => ({ ...item, matchedTerms }));
}

const join = (...parts: (string | string[] | undefined)[]) => parts.flat().filter(Boolean).join(" ");

export function findRelevantWork(resume: Resume, topic: string, limit = 5) {
  const terms = tokenize(topic);

  // A skill counts as matched when every word of it appears in the query.
  const matchedSkills = (resume.skills ?? []).flatMap((group) =>
    (group.keywords ?? [])
      .filter((kw) => {
        const kwTerms = tokenize(kw);
        return kwTerms.length > 0 && kwTerms.every((k) => terms.some((q) => termsMatch(q, k)));
      })
      .map((skill) => ({ skill, group: group.name })),
  );

  return {
    query: topic,
    termsSearched: terms,
    method:
      "Plain keyword overlap between the query and the resume text. Items are listed by how many query terms they share, " +
      "and each shows the terms it matched. No assessment of fit or suitability is made; draw your own conclusions from the evidence.",
    matchedSkills,
    projects: rank(resume.projects, (p) => join(p.name, p.description, p.keywords, p.type), terms, limit),
    notes: rank(resume.notes, (n) => join(n.title, n.summary, n.tags), terms, limit),
    experience: rank(resume.work, (w) => join(w.position, w.name, w.summary, w.highlights), terms, limit),
    publications: rank(resume.publications, (p) => join(p.name, p.publisher, p.venue), terms, limit),
    services: rank(resume.services, (s) => join(s.name, s.description), terms, limit),
  };
}
