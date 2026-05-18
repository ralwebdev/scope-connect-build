import type { Opportunity, PortfolioItem, ScopeUser } from "./scope-store";

const SKILL_SYNONYMS: Record<string, string> = {
  react: "React",
  reactjs: "React",
  reactjsx: "React",
  reactj: "React",
  reactjslibrary: "React",
  nextjs: "Next.js",
  next: "Next.js",
  nextj: "Next.js",
  node: "Node.js",
  nodejs: "Node.js",
  express: "Express",
  expressjs: "Express",
  javascript: "JavaScript",
  js: "JavaScript",
  typescript: "TypeScript",
  ts: "TypeScript",
  mongodb: "MongoDB",
  mongo: "MongoDB",
  mongoose: "MongoDB",
  sql: "SQL",
  mysql: "SQL",
  postgresql: "SQL",
  postgres: "SQL",
  figma: "Figma",
  uiux: "UI/UX Design",
  uxui: "UI/UX Design",
  uidesign: "UI Design",
  uxdesign: "UX Design",
  productdesign: "Product Design",
  mobileux: "Mobile UX",
  wireframing: "Wireframing",
  prototyping: "Prototyping",
  canva: "Canva",
  photoshop: "Photoshop",
  illustrator: "Illustrator",
  api: "APIs",
  apis: "APIs",
  restapi: "APIs",
  restfulapi: "APIs",
  dataviz: "Data Visualization",
  datavisualization: "Data Visualization",
  llm: "LLM APIs",
  llms: "LLM APIs",
  llmapis: "LLM APIs",
  openai: "LLM APIs",
  ai: "AI",
  ml: "Machine Learning",
  machinelearning: "Machine Learning",
  deeplearning: "Deep Learning",
  python: "Python",
  java: "Java",
  cpp: "C++",
  cplusplus: "C++",
  contentwriting: "Content",
  contentcreation: "Content",
  communitybuilding: "Community",
  outreach: "Outreach",
  logistics: "Logistics",
  coordination: "Coordination",
  research: "Research",
  surveydesign: "Survey Design",
  writing: "Writing",
  editorial: "Editorial",
  strategy: "Strategy",
  partnerships: "Partnerships",
  product: "Product",
  marketing: "Marketing",
  pitchdeck: "Pitch Deck",
};

function toKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function toTitleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function normalizeSkill(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const direct = SKILL_SYNONYMS[toKey(trimmed)];
  if (direct) return direct;

  const slashNormalized = trimmed.replace(/\s*\/\s*/g, "/");
  const dottedKey = toKey(slashNormalized.replace(/\./g, ""));
  if (SKILL_SYNONYMS[dottedKey]) return SKILL_SYNONYMS[dottedKey];

  return toTitleCase(trimmed.replace(/\s+/g, " "));
}

export function normalizeSkills(values: string[] | undefined | null): string[] {
  return Array.from(new Set((values ?? []).map(normalizeSkill).filter(Boolean)));
}

export function collectStudentSkills(user: ScopeUser | null, items: PortfolioItem[]): string[] {
  const profileSkills = normalizeSkills(user?.skills ?? []);
  const portfolioSkills = normalizeSkills(items.flatMap((item) => item.skills ?? []));
  return Array.from(new Set([...profileSkills, ...portfolioSkills]));
}

export function getOpportunityRequiredSkills(opportunity: Opportunity): string[] {
  return normalizeSkills([
    ...(opportunity.requiredSkills ?? []),
    opportunity.category,
  ]);
}

export function calculateOpportunityMatch(
  opportunity: Opportunity,
  user: ScopeUser | null,
  portfolioItems: PortfolioItem[],
) {
  const studentSkills = collectStudentSkills(user, portfolioItems);
  const requiredSkills = getOpportunityRequiredSkills(opportunity);
  const studentSet = new Set(studentSkills);
  const portfolioSet = new Set(normalizeSkills(portfolioItems.flatMap((item) => item.skills ?? [])));

  if (requiredSkills.length === 0) {
    return {
      score: studentSkills.length > 0 ? 55 : 0,
      matchedSkills: [],
      missingSkills: [],
    };
  }

  const matchedSkills = requiredSkills.filter((skill) => studentSet.has(skill));
  const missingSkills = requiredSkills.filter((skill) => !studentSet.has(skill));
  const portfolioMatches = matchedSkills.filter((skill) => portfolioSet.has(skill));

  const coverageScore = Math.round((matchedSkills.length / requiredSkills.length) * 75);
  const portfolioEvidenceBonus = Math.min(15, portfolioMatches.length * 5);
  const skillDepthBonus = Math.min(10, Math.max(0, studentSkills.length - matchedSkills.length));
  const score = Math.min(100, coverageScore + portfolioEvidenceBonus + skillDepthBonus);

  return {
    score,
    matchedSkills,
    missingSkills,
  };
}
