import { Job, JobProvider, JobSearchParams, JobSearchResult } from "./types";

/**
 * Utility to strip HTML tags from search highlights returned by API.
 */
function stripHtml(html?: string): string {
  if (!html) return "";
  return html.replace(/<\/?[^>]+(>|$)/g, "").trim();
}

/**
 * Resolves 2-letter ISO country code supported by Adzuna API.
 * Defaults to "in" (India).
 */
export function resolveAdzunaCountry(location?: string, explicitCountry?: string): string {
  if (explicitCountry && /^[a-z]{2}$/i.test(explicitCountry.trim())) {
    return explicitCountry.trim().toLowerCase();
  }
  if (!location) return "in";

  const loc = location.toLowerCase().trim();
  if (
    loc.includes("india") ||
    loc.includes("bangalore") ||
    loc.includes("bengaluru") ||
    loc.includes("mumbai") ||
    loc.includes("delhi") ||
    loc.includes("hyderabad") ||
    loc.includes("pune") ||
    loc.includes("chennai") ||
    loc.includes("gurgaon") ||
    loc.includes("noida") ||
    loc === "in"
  ) {
    return "in";
  }

  if (
    loc.includes("united states") ||
    loc.includes("usa") ||
    loc === "us" ||
    loc.includes("san francisco") ||
    loc.includes("new york") ||
    loc.includes("seattle") ||
    loc.includes("austin")
  ) {
    return "us";
  }

  if (
    loc.includes("united kingdom") ||
    loc.includes("britain") ||
    loc.includes("london") ||
    loc === "uk" ||
    loc === "gb"
  ) {
    return "gb";
  }

  if (loc.includes("canada") || loc === "ca" || loc.includes("toronto") || loc.includes("vancouver")) {
    return "ca";
  }

  if (loc.includes("australia") || loc === "au" || loc.includes("sydney") || loc.includes("melbourne")) {
    return "au";
  }

  if (loc.includes("germany") || loc === "de" || loc.includes("berlin") || loc.includes("munich")) {
    return "de";
  }

  if (loc.includes("singapore") || loc === "sg") {
    return "sg";
  }

  if (/^[a-z]{2}$/i.test(loc)) {
    return loc;
  }

  return "in";
}

export class AdzunaProvider implements JobProvider {
  public readonly name = "adzuna";

  /**
   * Search live job listings through Adzuna API.
   * Strictly keeps credentials server-side and maps to normalized Job model.
   */
  async searchJobs(params: JobSearchParams): Promise<JobSearchResult> {
    const appId = process.env.ADZUNA_APP_ID?.trim();
    const appKey = process.env.ADZUNA_APP_KEY?.trim();

    if (!appId || !appKey) {
      const err: any = new Error(
        "Adzuna credentials (ADZUNA_APP_ID, ADZUNA_APP_KEY) are missing in the server environment. Please configure them in your .env file."
      );
      err.code = "ADZUNA_CONFIG_MISSING";
      throw err;
    }

    const country = resolveAdzunaCountry(params.location, params.country);
    const page = params.page && params.page > 0 ? Math.floor(params.page) : 1;

    const endpoint = `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}`;
    const url = new URL(endpoint);

    url.searchParams.set("app_id", appId);
    url.searchParams.set("app_key", appKey);
    url.searchParams.set("content-type", "application/json");

    if (params.query?.trim()) {
      url.searchParams.set("what", params.query.trim());
    }

    if (params.location?.trim()) {
      // If user typed only "India" and country is "in", we don't need a strict "where=india" filter
      // which can unnecessarily restrict nationwide listings. But for specific cities, set "where".
      const locClean = params.location.trim();
      if (locClean.toLowerCase() !== "india") {
        url.searchParams.set("where", locClean);
      }
    }

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          "User-Agent": "Yatra-Career-Engine/1.0",
        },
      });
    } catch (networkErr: any) {
      const err: any = new Error(`Failed to reach Adzuna API: ${networkErr?.message || "Network error"}`);
      err.code = "ADZUNA_NETWORK_ERROR";
      throw err;
    }

    if (!response.ok) {
      let details = "";
      try {
        const text = await response.text();
        if (text) {
          details = text.slice(0, 300);
        }
      } catch (_) {}

      const err: any = new Error(
        `Adzuna API returned HTTP ${response.status} (${response.statusText})${details ? `: ${details}` : ""}`
      );
      err.code = response.status === 401 || response.status === 403 ? "ADZUNA_AUTH_FAILED" : `ADZUNA_HTTP_${response.status}`;
      throw err;
    }

    let data: any;
    try {
      data = await response.json();
    } catch (parseErr: any) {
      const err: any = new Error("Failed to parse Adzuna response as JSON");
      err.code = "ADZUNA_PARSE_ERROR";
      throw err;
    }

    const rawResults: any[] = Array.isArray(data?.results) ? data.results : [];
    const fetchedAt = new Date().toISOString();

    const jobs: Job[] = rawResults.map((raw: any) => {
      const sourceJobId = String(raw.id || "");
      const redirectUrl = String(raw.redirect_url || "");
      const rawLocation = raw.location;
      const formattedLocation =
        rawLocation?.display_name ||
        (Array.isArray(rawLocation?.area) ? rawLocation.area.join(", ") : "") ||
        "India / Unspecified";

      return {
        id: `adzuna-${sourceJobId}`,
        source: "adzuna",
        sourceJobId,
        sourceUrl: redirectUrl,
        url: redirectUrl,
        company: raw.company?.display_name || "Confidential / Unspecified",
        title: stripHtml(raw.title || "Untitled Position"),
        location: formattedLocation,
        // Official note: Adzuna search descriptions are snippets/excerpts, not full long-form descriptions
        description: stripHtml(raw.description || ""),
        postedAt: raw.created || "",
        fetchedAt,
        salaryMin: typeof raw.salary_min === "number" ? Math.round(raw.salary_min) : null,
        salaryMax: typeof raw.salary_max === "number" ? Math.round(raw.salary_max) : null,
        category: raw.category?.label || raw.category?.tag || "",
      };
    });

    return {
      total: typeof data?.count === "number" ? data.count : jobs.length,
      jobs,
    };
  }
}

export const adzunaProvider = new AdzunaProvider();
