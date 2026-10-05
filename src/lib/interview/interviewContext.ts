/**
 * Interview Context Management & Scoped Persistence
 * Ensures reliable, isolated context transfer between Live Jobs and Interview modes.
 * Prevents cross-job contamination, stale TCS/SWE defaults, and session cross-loading.
 */

export interface ActiveInterviewContext {
  jobId: string;
  company: string;
  role: string;
  jobDescription: string;
  candidateSkills: string;
  setId: string;
  isVR: boolean;
  resumeReference?: any;
}

/**
 * Derives a stable, deterministic job identifier from a job object.
 * Prefers existing unique IDs (e.g. Adzuna ID), falling back to deterministic slug.
 */
export function getStableJobId(job: { id?: string | number; sourceJobId?: string; company?: string; title?: string } | null | undefined): string {
  if (!job) return 'job_unknown';
  if (job.id && String(job.id).trim().length > 0) {
    return String(job.id).trim();
  }
  if (job.sourceJobId && String(job.sourceJobId).trim().length > 0) {
    return String(job.sourceJobId).trim();
  }
  const cleanComp = (job.company || 'company').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const cleanRole = (job.title || 'role').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return `job_${cleanComp}_${cleanRole}`;
}

/**
 * Saves active interview context to scoped browser storage.
 */
export function persistActiveInterviewContext(context: ActiveInterviewContext): void {
  if (typeof window === 'undefined') return;

  const serialized = JSON.stringify(context);
  // Store currently active context
  sessionStorage.setItem('active_interview_context', serialized);
  localStorage.setItem('active_interview_context', serialized);

  // Store scoped by stable jobId so switching jobs never contaminates
  if (context.jobId) {
    localStorage.setItem(`interview_context_${context.jobId}`, serialized);
    if (context.setId) {
      localStorage.setItem(`job_canonical_set_${context.jobId}`, context.setId);
    }
  }
  if (context.setId) {
    localStorage.setItem(`canonical_set_for_${context.jobId}`, context.setId);
  }
}

/**
 * Retrieves the interview context from scoped browser storage or query parameters.
 */
export function retrieveActiveInterviewContext(targetJobId?: string | null): ActiveInterviewContext | null {
  if (typeof window === 'undefined') return null;

  // 1. If targetJobId is specified, check job-scoped storage first
  if (targetJobId) {
    const scoped = localStorage.getItem(`interview_context_${targetJobId}`);
    if (scoped) {
      try { return JSON.parse(scoped); } catch (e) {}
    }
  }

  // 2. Check active sessionStorage
  const sessionData = sessionStorage.getItem('active_interview_context');
  if (sessionData) {
    try {
      const parsed = JSON.parse(sessionData);
      if (!targetJobId || parsed.jobId === targetJobId) {
        return parsed;
      }
    } catch (e) {}
  }

  // 3. Check active localStorage
  const localData = localStorage.getItem('active_interview_context');
  if (localData) {
    try {
      const parsed = JSON.parse(localData);
      if (!targetJobId || parsed.jobId === targetJobId) {
        return parsed;
      }
    } catch (e) {}
  }

  return null;
}

/**
 * Clears old un-scoped legacy keys that caused stale TCS/Software Engineer contamination.
 */
export function purgeLegacyUnscopedKeys(): void {
  if (typeof window === 'undefined') return;
  // Clean up legacy global keys that lacked job-scoping
  const legacyKeys = [
    'active_interview_set_id',
    'active_interview_session_id',
    'active_interview_is_vr'
  ];
  legacyKeys.forEach(k => localStorage.removeItem(k));
}
