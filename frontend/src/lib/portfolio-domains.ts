// Domain-driven portfolio system for student profiles.
// Source of truth for primary_domain, specializations, and dynamic portfolio fields.

export type DomainKey =
  | "software_tech" | "design_uiux" | "animation_vfx" | "game_development"
  | "digital_marketing" | "content_media" | "film_video" | "photography"
  | "architecture_civil" | "business_management" | "finance_accounting" | "law"
  | "research_academia" | "healthcare" | "fashion_lifestyle" | "music_audio"
  | "education_training" | "entrepreneurship" | "general_misc";

export const DOMAIN_LABELS: Record<DomainKey, string> = {
  software_tech: "Software & Tech",
  design_uiux: "Design / UI-UX",
  animation_vfx: "Animation & VFX",
  game_development: "Game Development",
  digital_marketing: "Digital Marketing",
  content_media: "Content & Media",
  film_video: "Film & Video",
  photography: "Photography",
  architecture_civil: "Architecture / Civil",
  business_management: "Business & Management",
  finance_accounting: "Finance & Accounting",
  law: "Law",
  research_academia: "Research / Academia",
  healthcare: "Healthcare",
  fashion_lifestyle: "Fashion & Lifestyle",
  music_audio: "Music & Audio",
  education_training: "Education & Training",
  entrepreneurship: "Entrepreneurship",
  general_misc: "General / Other",
};

export const SPECIALIZATIONS: Record<DomainKey, string[]> = {
  software_tech: ["frontend_developer","backend_developer","fullstack_developer","mobile_app_developer","ai_ml_engineer","data_analyst","cybersecurity","cloud_devops","qa_tester","blockchain_web3"],
  design_uiux: ["ui_designer","ux_researcher","product_designer","graphic_designer","brand_designer","motion_designer"],
  animation_vfx: ["2d_animator","3d_animator","vfx_artist","motion_graphics","compositor"],
  game_development: ["game_programmer","unity_developer","unreal_developer","game_designer","level_designer","technical_artist"],
  digital_marketing: ["seo","performance_marketing","social_media_marketing","content_marketing","email_marketing","brand_strategy"],
  content_media: ["content_writer","copywriter","journalist","scriptwriter","editor","blogger"],
  film_video: ["video_editor","filmmaker","cinematographer","director","sound_designer"],
  photography: ["fashion_photography","product_photography","wildlife","wedding","portrait"],
  architecture_civil: ["architect","interior_designer","urban_designer","civil_designer"],
  business_management: ["finance","hr","operations","business_analyst","consulting","sales"],
  finance_accounting: ["accountant","financial_analyst","auditor","taxation"],
  law: ["corporate_law","litigation","ip_law","cyber_law"],
  research_academia: ["researcher","phd_aspirant","academic_writer"],
  healthcare: ["medical_student","pharma_student","health_researcher"],
  fashion_lifestyle: ["fashion_designer","stylist","apparel_designer"],
  music_audio: ["music_producer","singer","instrumentalist","podcaster","voice_artist"],
  education_training: ["teacher","trainer","educator"],
  entrepreneurship: ["startup_founder","product_builder"],
  general_misc: ["generalist"],
};

export const DOMAIN_PORTFOLIO_FIELDS: Record<DomainKey, string[]> = {
  software_tech: ["github","gitlab","stack_overflow","kaggle","leetcode","hackerrank","codechef","codeforces","dockerhub","huggingface","medium_blog"],
  design_uiux: ["behance","dribbble","figma","adobe_portfolio","notion_portfolio","pinterest"],
  animation_vfx: ["artstation","behance","vimeo","youtube","sketchfab"],
  game_development: ["itch_io","steam","epic_store","playstore","appstore","github","artstation","youtube"],
  digital_marketing: ["linkedin","medium","substack","notion","drive_portfolio","youtube","canva_portfolio"],
  content_media: ["medium","substack","blog","linkedin","notion","wattpad"],
  film_video: ["youtube","vimeo","behance","instagram"],
  photography: ["instagram","behance","flickr","500px"],
  architecture_civil: ["behance","issuu","pinterest","website"],
  business_management: ["linkedin","notion","medium","slideshare"],
  finance_accounting: ["linkedin","slideshare"],
  law: ["linkedin","researchgate","ssrn"],
  research_academia: ["google_scholar","orcid","researchgate","academia"],
  healthcare: ["linkedin","researchgate","orcid"],
  fashion_lifestyle: ["behance","instagram","pinterest"],
  music_audio: ["spotify","soundcloud","youtube","apple_music","podcast"],
  education_training: ["linkedin","youtube","notion"],
  entrepreneurship: ["linkedin","crunchbase","producthunt","website","pitchdeck"],
  general_misc: ["website","linkedin","notion","drive_portfolio"],
};

const TITLE_OVERRIDES: Record<string, string> = {
  ui_designer: "UI Designer", ux_researcher: "UX Researcher",
  ai_ml_engineer: "AI/ML Engineer", qa_tester: "QA / Tester",
  cloud_devops: "Cloud / DevOps", blockchain_web3: "Blockchain / Web3",
  github: "GitHub", gitlab: "GitLab", stack_overflow: "Stack Overflow",
  leetcode: "LeetCode", hackerrank: "HackerRank", codechef: "CodeChef",
  codeforces: "Codeforces", dockerhub: "Docker Hub", huggingface: "Hugging Face",
  medium_blog: "Medium Blog", behance: "Behance", dribbble: "Dribbble",
  figma: "Figma", adobe_portfolio: "Adobe Portfolio", notion_portfolio: "Notion Portfolio",
  pinterest: "Pinterest", artstation: "ArtStation", vimeo: "Vimeo", youtube: "YouTube",
  sketchfab: "Sketchfab", itch_io: "itch.io", steam: "Steam", epic_store: "Epic Store",
  playstore: "Play Store", appstore: "App Store", linkedin: "LinkedIn",
  medium: "Medium", substack: "Substack", notion: "Notion",
  drive_portfolio: "Drive Portfolio", canva_portfolio: "Canva Portfolio",
  blog: "Blog", wattpad: "Wattpad", instagram: "Instagram", flickr: "Flickr",
  "500px": "500px", issuu: "Issuu", website: "Website", slideshare: "SlideShare",
  researchgate: "ResearchGate", ssrn: "SSRN", google_scholar: "Google Scholar",
  orcid: "ORCID", academia: "Academia.edu", spotify: "Spotify",
  soundcloud: "SoundCloud", apple_music: "Apple Music", podcast: "Podcast",
  crunchbase: "Crunchbase", producthunt: "Product Hunt", pitchdeck: "Pitch Deck",
};

export function humanize(key: string): string {
  if (TITLE_OVERRIDES[key]) return TITLE_OVERRIDES[key];
  return key.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export const DOMAIN_KEYS = Object.keys(DOMAIN_LABELS) as DomainKey[];
