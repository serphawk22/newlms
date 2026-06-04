/** Maps course titles/categories to subject images in public/course-images/ */

export const DEFAULT_COURSE_BANNER = "/course-images/default-course.png";

const KEYWORD_IMAGES: { image: string; keywords: string[] }[] = [
  // 1. Centralized mappings requested by the user
  {
    image: "/course-images/OS.png",
    keywords: ["operating systems", "operating system", "os"],
  },
  {
    image: "/course-images/ds.png",
    keywords: ["data structures", "data structure", "ds", "dsa", "algorithms", "algorithm", "complexity", "big o", "flowchart"],
  },
  {
    image: "/course-images/ai.png",
    keywords: ["artificial intelligence", "machine learning", "deep learning", "neural", "data science", "ai", "ml"],
  },
  {
    image: "/course-images/cloud computing.png",
    keywords: ["cloud computing", "cloud", "aws", "azure", "gcp"],
  },
  
  // 2. Fallbacks from the previous banner resolution logic (migrated to /course-images/)
  {
    image: "/course-images/cybersecurity.png",
    keywords: ["cyber", "security", "encryption", "threat", "infosec", "hacking"],
  },
  {
    image: "/course-images/web-development.png",
    keywords: ["web dev", "web development", "frontend", "react", "javascript", "html", "css", "full stack"],
  },
  {
    image: "/course-images/software-engineering.png",
    keywords: ["software engineering", "sdlc", "architecture", "design patterns", "system design"],
  },
  {
    image: "/course-images/devops.png",
    keywords: ["devops", "ci/cd", "cicd", "pipeline", "docker", "kubernetes", "automation"],
  },
  {
    image: "/course-images/database.png",
    keywords: ["database", "dbms", "sql", "postgres", "mysql", "mongodb", "nosql"],
  },
  {
    image: "/course-images/mobile-development.png",
    keywords: ["mobile", "android", "ios", "react native", "flutter", "swift", "kotlin"],
  },
  {
    image: "/course-images/ui-ux.png",
    keywords: ["ui", "ux", "ui/ux", "wireframe", "prototype", "design system", "figma"],
  },
];

function matchesKeyword(titleLower: string, keyword: string): boolean {
  const trimmed = keyword.trim();
  if (!trimmed) return false;

  // Escape special regex characters
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Require word boundaries for alphanumeric bounds to prevent partial matching (e.g. matching "os" in "mostly")
  const startBoundary = /^[a-zA-Z0-9]/.test(trimmed) ? "\\b" : "";
  const endBoundary = /[a-zA-Z0-9]$/.test(trimmed) ? "\\b" : "";

  const regex = new RegExp(`${startBoundary}${escaped}${endBoundary}`, "i");
  return regex.test(titleLower);
}

export function getCourseBannerUrl(title: string): string {
  const lower = title.toLowerCase();

  for (const { image, keywords } of KEYWORD_IMAGES) {
    if (keywords.some((kw) => matchesKeyword(lower, kw))) {
      return image;
    }
  }

  return DEFAULT_COURSE_BANNER;
}
