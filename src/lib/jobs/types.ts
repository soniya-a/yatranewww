export interface Job {
  id: string;
  source: "adzuna" | string;
  sourceJobId: string;
  sourceUrl: string;
  url: string;
  company: string;
  title: string;
  location: string;
  description: string; // Note: search results provide an excerpt/snippet as per Adzuna specifications
  postedAt: string;
  fetchedAt: string;
  salaryMin: number | null;
  salaryMax: number | null;
  category: string;
}

export interface JobSearchParams {
  query: string;
  location?: string;
  page?: number;
  country?: string;
}

export interface JobSearchResult {
  total?: number;
  jobs: Job[];
}

export interface JobProvider {
  name: string;
  searchJobs(params: JobSearchParams): Promise<JobSearchResult>;
}
