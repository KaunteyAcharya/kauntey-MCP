// Fetches Kauntey's resume from his site at runtime. This package ships no
// resume data: the single source of truth is RESUME_URL.

export const SITE_URL = "https://kaunteyacharya.com";
export const RESUME_URL = `${SITE_URL}/resume.json`;

const CACHE_TTL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;

// Loose shape of resume.json (JSON Resume schema plus extensions).
// Every field is optional so a partial file never crashes a tool.
export interface Link {
  name?: string;
  url?: string;
}

export interface Resume {
  basics?: {
    name?: string;
    label?: string;
    positioning?: string;
    image?: string;
    email?: string;
    url?: string;
    summary?: string;
    location?: { city?: string; region?: string; countryCode?: string };
    timezone?: string;
    availability?: { status?: string; note?: string; interestedIn?: string[] };
    contact?: Record<string, string | null | undefined>;
    profiles?: { network?: string; username?: string; url?: string }[];
    [extra: string]: unknown;
  };
  education?: {
    institution?: string;
    area?: string;
    studyType?: string;
    startDate?: string;
    endDate?: string;
    url?: string;
    summary?: string;
  }[];
  work?: {
    name?: string;
    position?: string;
    startDate?: string;
    endDate?: string;
    summary?: string;
    highlights?: string[];
  }[];
  skills?: { name?: string; keywords?: string[] }[];
  projects?: {
    name?: string;
    description?: string;
    keywords?: string[];
    url?: string;
    repository?: string;
    note?: string;
    links?: Record<string, string>;
    type?: string;
  }[];
  publications?: {
    name?: string;
    authors?: string[];
    publisher?: string;
    venue?: string;
    releaseDate?: string;
    doi?: string;
    url?: string;
  }[];
  services?: { name?: string; description?: string; evidence?: Link[] }[];
  engagementProcess?: { step?: string; description?: string }[];
  notes?: { title?: string; date?: string; tags?: string[]; url?: string; summary?: string }[];
  interests?: { name?: string }[];
  meta?: Record<string, unknown>;
  // Sections added to resume.json later, surfaced by get_profile without a republish.
  [extra: string]: unknown;
}

export class ResumeUnavailableError extends Error {
  constructor(reason: string) {
    super(
      `Could not load Kauntey Acharya's resume from ${RESUME_URL} (${reason}). ` +
        `No offline copy exists by design, so nothing can be answered right now. ` +
        `Please visit ${SITE_URL} directly, or try again in a moment.`,
    );
    this.name = "ResumeUnavailableError";
  }
}

let cache: { data: Resume; fetchedAt: number } | null = null;
let inFlight: Promise<Resume> | null = null;

async function fetchResume(): Promise<Resume> {
  let res: Response;
  try {
    res = await fetch(RESUME_URL, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    throw new ResumeUnavailableError(err instanceof Error ? err.message : String(err));
  }
  if (!res.ok) throw new ResumeUnavailableError(`HTTP ${res.status}`);

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new ResumeUnavailableError("response was not valid JSON");
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new ResumeUnavailableError("response was not a JSON object");
  }
  return data as Resume;
}

/** Returns the resume, re-fetching once the 5-minute cache expires. */
export async function getResume(): Promise<Resume> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.data;
  // Share one request between concurrent tool calls.
  inFlight ??= fetchResume()
    .then((data) => {
      cache = { data, fetchedAt: Date.now() };
      return data;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}
