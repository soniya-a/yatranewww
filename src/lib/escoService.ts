import { queryLocalPostgres, isLocalPostgresConfigured, testLocalPostgresConnection } from './localPostgres';

export interface EscoStatusResult {
  configured: boolean;
  connected: boolean;
  database?: string;
  user?: string;
  schema?: string;
  tablesCount?: number;
  occupationsCount?: number;
  skillsCount?: number;
  relationsCount?: number;
  sampleOccupation?: string;
  sampleSkill?: string;
  error?: string;
}

export interface EscoPaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface EscoOccupationsQuery extends EscoPaginationParams {
  isco?: string;
  code?: string;
}

export interface EscoSkillsQuery extends EscoPaginationParams {
  skillType?: string;
  reuseLevel?: string;
}

export interface EscoRelationsQuery extends EscoPaginationParams {
  occupationUri?: string;
  skillUri?: string;
  relationType?: string;
}

export interface PaginatedResult<T> {
  success: boolean;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  data: T[];
  timingMs?: number;
}

/**
 * Retrieves the connection and health status of local PostgreSQL ESCO dataset.
 */
export async function getEscoStatus(): Promise<EscoStatusResult> {
  if (!isLocalPostgresConfigured()) {
    return {
      configured: false,
      connected: false,
      error: 'DATABASE_URL is not configured in backend environment.'
    };
  }

  const diag = await testLocalPostgresConnection();
  return {
    configured: true,
    connected: diag.success,
    database: diag.database,
    user: diag.user,
    schema: diag.schema,
    tablesCount: diag.tablesCount,
    occupationsCount: diag.occupationsCount,
    skillsCount: diag.skillsCount,
    relationsCount: diag.relationsCount,
    sampleOccupation: diag.sampleOccupation,
    sampleSkill: diag.sampleSkill,
    error: diag.error
  };
}

/**
 * Searches and paginates ESCO occupations from occupations_en.
 */
export async function getOccupations(params: EscoOccupationsQuery): Promise<PaginatedResult<any>> {
  const t0 = Date.now();
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
  const offset = (page - 1) * limit;

  const whereClauses: string[] = [];
  const queryParams: any[] = [];

  if (params.search && typeof params.search === 'string' && params.search.trim()) {
    queryParams.push(`%${params.search.trim()}%`);
    const idx = queryParams.length;
    whereClauses.push(`(preferredlabel ILIKE $${idx} OR altlabels ILIKE $${idx})`);
  }

  if (params.isco && typeof params.isco === 'string' && params.isco.trim()) {
    queryParams.push(`${params.isco.trim()}%`);
    const idx = queryParams.length;
    whereClauses.push(`iscogroup LIKE $${idx}`);
  }

  if (params.code && typeof params.code === 'string' && params.code.trim()) {
    queryParams.push(params.code.trim());
    const idx = queryParams.length;
    whereClauses.push(`code = $${idx}`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // 1. Get total count
  const countSql = `SELECT count(*)::int as total FROM esco_raw.occupations_en ${whereSql};`;
  const countRes = await queryLocalPostgres(countSql, queryParams);
  const total = countRes.rows[0]?.total || 0;

  // 2. Query page data
  const dataParams = [...queryParams, limit, offset];
  const limitIdx = queryParams.length + 1;
  const offsetIdx = queryParams.length + 2;

  const dataSql = `
    SELECT 
      concepturi, preferredlabel, altlabels, iscogroup, code, 
      scopenote, definition, description, status
    FROM esco_raw.occupations_en 
    ${whereSql}
    ORDER BY preferredlabel ASC
    LIMIT $${limitIdx} OFFSET $${offsetIdx};
  `;
  const dataRes = await queryLocalPostgres(dataSql, dataParams);

  return {
    success: true,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    data: dataRes.rows,
    timingMs: Date.now() - t0
  };
}

/**
 * Fetches a single occupation by concept URI, including its related skills.
 */
export async function getOccupationByUri(
  uri: string,
  includeSkills: boolean = true
): Promise<{ success: boolean; occupation?: any; skills?: any[]; error?: string }> {
  if (!uri || typeof uri !== 'string') {
    return { success: false, error: 'Valid uri parameter is required' };
  }

  const occRes = await queryLocalPostgres(
    `SELECT * FROM esco_raw.occupations_en WHERE concepturi = $1 LIMIT 1;`,
    [uri.trim()]
  );

  if (!occRes.rows || occRes.rows.length === 0) {
    return { success: false, error: 'Occupation not found' };
  }

  const occupation = occRes.rows[0];
  let skills: any[] = [];

  if (includeSkills) {
    const skillsRes = await queryLocalPostgres(
      `SELECT skilluri, skilllabel, skilltype, relationtype 
       FROM esco_raw.occupationskillrelations_en 
       WHERE occupationuri = $1 
       ORDER BY relationtype ASC, skilllabel ASC;`,
      [uri.trim()]
    );
    skills = skillsRes.rows;
  }

  return {
    success: true,
    occupation,
    skills
  };
}

/**
 * Searches and paginates ESCO skills from skills_en.
 */
export async function getSkills(params: EscoSkillsQuery): Promise<PaginatedResult<any>> {
  const t0 = Date.now();
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
  const offset = (page - 1) * limit;

  const whereClauses: string[] = [];
  const queryParams: any[] = [];

  if (params.search && typeof params.search === 'string' && params.search.trim()) {
    queryParams.push(`%${params.search.trim()}%`);
    const idx = queryParams.length;
    whereClauses.push(`(preferredlabel ILIKE $${idx} OR altlabels ILIKE $${idx})`);
  }

  if (params.skillType && typeof params.skillType === 'string' && params.skillType.trim()) {
    queryParams.push(params.skillType.trim().toLowerCase());
    const idx = queryParams.length;
    whereClauses.push(`LOWER(skilltype) = $${idx}`);
  }

  if (params.reuseLevel && typeof params.reuseLevel === 'string' && params.reuseLevel.trim()) {
    queryParams.push(params.reuseLevel.trim().toLowerCase());
    const idx = queryParams.length;
    whereClauses.push(`LOWER(reuselevel) = $${idx}`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // 1. Get total count
  const countSql = `SELECT count(*)::int as total FROM esco_raw.skills_en ${whereSql};`;
  const countRes = await queryLocalPostgres(countSql, queryParams);
  const total = countRes.rows[0]?.total || 0;

  // 2. Query page data
  const dataParams = [...queryParams, limit, offset];
  const limitIdx = queryParams.length + 1;
  const offsetIdx = queryParams.length + 2;

  const dataSql = `
    SELECT 
      concepturi, preferredlabel, altlabels, skilltype, reuselevel, 
      scopenote, definition, description, status
    FROM esco_raw.skills_en 
    ${whereSql}
    ORDER BY preferredlabel ASC
    LIMIT $${limitIdx} OFFSET $${offsetIdx};
  `;
  const dataRes = await queryLocalPostgres(dataSql, dataParams);

  return {
    success: true,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    data: dataRes.rows,
    timingMs: Date.now() - t0
  };
}

/**
 * Fetches a single skill by concept URI, including related occupations.
 */
export async function getSkillByUri(
  uri: string,
  includeOccupations: boolean = true
): Promise<{ success: boolean; skill?: any; relatedOccupations?: any[]; error?: string }> {
  if (!uri || typeof uri !== 'string') {
    return { success: false, error: 'Valid uri parameter is required' };
  }

  const sklRes = await queryLocalPostgres(
    `SELECT * FROM esco_raw.skills_en WHERE concepturi = $1 LIMIT 1;`,
    [uri.trim()]
  );

  if (!sklRes.rows || sklRes.rows.length === 0) {
    return { success: false, error: 'Skill not found' };
  }

  const skill = sklRes.rows[0];
  let relatedOccupations: any[] = [];

  if (includeOccupations) {
    const occRes = await queryLocalPostgres(
      `SELECT occupationuri, occupationlabel, relationtype, skilltype 
       FROM esco_raw.occupationskillrelations_en 
       WHERE skilluri = $1 
       ORDER BY relationtype ASC, occupationlabel ASC;`,
      [uri.trim()]
    );
    relatedOccupations = occRes.rows;
  }

  return {
    success: true,
    skill,
    relatedOccupations
  };
}

/**
 * Searches and paginates occupation-skill relationships from occupationskillrelations_en.
 */
export async function getOccupationSkillRelations(
  params: EscoRelationsQuery
): Promise<PaginatedResult<any>> {
  const t0 = Date.now();
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(params.limit) || 50));
  const offset = (page - 1) * limit;

  const whereClauses: string[] = [];
  const queryParams: any[] = [];

  if (params.occupationUri && typeof params.occupationUri === 'string' && params.occupationUri.trim()) {
    queryParams.push(params.occupationUri.trim());
    const idx = queryParams.length;
    whereClauses.push(`occupationuri = $${idx}`);
  }

  if (params.skillUri && typeof params.skillUri === 'string' && params.skillUri.trim()) {
    queryParams.push(params.skillUri.trim());
    const idx = queryParams.length;
    whereClauses.push(`skilluri = $${idx}`);
  }

  if (params.relationType && typeof params.relationType === 'string' && params.relationType.trim()) {
    queryParams.push(params.relationType.trim().toLowerCase());
    const idx = queryParams.length;
    whereClauses.push(`LOWER(relationtype) = $${idx}`);
  }

  if (params.search && typeof params.search === 'string' && params.search.trim()) {
    queryParams.push(`%${params.search.trim()}%`);
    const idx = queryParams.length;
    whereClauses.push(`(occupationlabel ILIKE $${idx} OR skilllabel ILIKE $${idx})`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // 1. Get count
  const countSql = `SELECT count(*)::int as total FROM esco_raw.occupationskillrelations_en ${whereSql};`;
  const countRes = await queryLocalPostgres(countSql, queryParams);
  const total = countRes.rows[0]?.total || 0;

  // 2. Query rows
  const dataParams = [...queryParams, limit, offset];
  const limitIdx = queryParams.length + 1;
  const offsetIdx = queryParams.length + 2;

  const dataSql = `
    SELECT occupationuri, occupationlabel, relationtype, skilltype, skilluri, skilllabel 
    FROM esco_raw.occupationskillrelations_en 
    ${whereSql} 
    ORDER BY occupationlabel ASC, relationtype ASC, skilllabel ASC 
    LIMIT $${limitIdx} OFFSET $${offsetIdx};
  `;
  const dataRes = await queryLocalPostgres(dataSql, dataParams);

  return {
    success: true,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    data: dataRes.rows,
    timingMs: Date.now() - t0
  };
}
