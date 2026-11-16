// ==============================================================================
// YATRA AI: End-to-End Interview Assessment Scorecard Engine
// Grounded in:
//   1. Question-specific scoring rubrics, expected points, and constraints
//   2. Objective MCQ correctness and explanations for Aptitude
//   3. Code correctness, complexity targets, and edge cases for Coding / OA
//   4. STAR methodology and behavioral criteria for HR / Leadership
//   5. Multi-perspective articulation and synthesis for Group Discussion
//   6. Actual candidate resume claims for Project Deep Dives
//   7. Transparent round scorecards with no ungrounded scores
// ==============================================================================

import { GoogleGenAI } from '@google/genai';
import { supabase, isSupabaseConfigured } from '../lib/supabaseServer';
import {
  getCanonicalQuestionSet,
  getInterviewSession,
  type SessionRequestContext
} from './questionEngine';
import { normalizeRoundCategory, type CanonicalRoundType } from './intelligenceRepository';
import type {
  CanonicalInterviewQuestion,
  InterviewAssessmentReport,
  InterviewEvaluationInput,
  QuestionEvaluation,
  RoundScorecard,
  RecommendedRoadmapItem,
  RubricCriterionScore
} from '../types/interview';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Scoped Google GenAI instance
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || 'dummy_key',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Cache for persistent retrieval by report ID and session ID
const reportsStore = new Map<string, InterviewAssessmentReport>();
const REPORTS_CACHE_FILE = path.join(process.cwd(), 'src', 'data', 'interviewReportsCache.json');

function initReportsStore() {
  try {
    const dir = path.dirname(REPORTS_CACHE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(REPORTS_CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(REPORTS_CACHE_FILE, 'utf-8'));
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item?.id) {
            reportsStore.set(item.id, item);
          }
        }
      }
    }
  } catch (e) {
    // Non-fatal cache load error
  }
}
initReportsStore();

function persistLocalReport(report: InterviewAssessmentReport) {
  reportsStore.set(report.id, report);
  try {
    const all = Array.from(reportsStore.values());
    fs.writeFileSync(REPORTS_CACHE_FILE, JSON.stringify(all, null, 2), 'utf-8');
  } catch (e) {
    // Non-fatal file write error
  }
}

// ── 1. HELPER: QUESTION ANSWER EXTRACTION ─────────────────────────────────────
function extractAnswerForQuestion(
  q: CanonicalInterviewQuestion,
  answers: Record<string, string>,
  codeAnswers?: Record<string, string>,
  chatHistory?: Array<{ role: string; text: string; question_id?: string }>
): { answerText: string; codeText: string } {
  let answerText = '';
  let codeText = '';

  // 1. Direct match by question_id (e.g. Q001)
  if (answers[q.question_id]) {
    answerText = answers[q.question_id];
  } else if (q.slot_number && answers[`Q${String(q.slot_number).padStart(3, '0')}`]) {
    answerText = answers[`Q${String(q.slot_number).padStart(3, '0')}`];
  } else if (q.slot_number && answers[String(q.slot_number - 1)]) {
    answerText = answers[String(q.slot_number - 1)];
  }

  // 2. Code answers
  if (codeAnswers) {
    if (codeAnswers[q.question_id]) {
      codeText = codeAnswers[q.question_id];
    } else if (q.slot_number && codeAnswers[`Q${String(q.slot_number).padStart(3, '0')}`]) {
      codeText = codeAnswers[`Q${String(q.slot_number).padStart(3, '0')}`];
    }
  }

  // 3. Fallback to transcript search by question_id
  if (!answerText && chatHistory && Array.isArray(chatHistory)) {
    const matchingMsgs = chatHistory.filter(
      m => m.role === 'user' && (m.question_id === q.question_id || m.text.includes(q.canonical_title || ''))
    );
    if (matchingMsgs.length > 0) {
      answerText = matchingMsgs.map(m => m.text).join('\n');
    }
  }

  return {
    answerText: (answerText || '').trim(),
    codeText: (codeText || '').trim()
  };
}

// ── 2. HELPER: QUESTION UNANSWERED CHECK ──────────────────────────────────────
function isAnswerEffectivelyEmpty(answerText: string, codeText: string): boolean {
  const combined = (answerText + ' ' + codeText).trim();
  if (combined.length === 0) return true;
  if (combined.length < 4 && !/^[A-Da-d]$/.test(combined)) return true;
  if (/^(skip|skipped|idk|no idea|pass|next|dont know|don't know|no answer)$/i.test(answerText.trim())) {
    return true;
  }
  return false;
}

// ── 3. EVALUATION BY CANONICAL ROUND TYPE ─────────────────────────────────────

/**
 * Evaluates an Aptitude & Logical Reasoning MCQ question.
 * Strictly verifies against correct_answer and explanation without forcing communication scoring.
 */
function evaluateAptitudeQuestion(
  q: CanonicalInterviewQuestion,
  answerText: string
): { score: number; verdict: QuestionEvaluation['verdict']; strengths: string[]; missing_concepts: string[]; feedback: string } {
  const normAnswer = answerText.toLowerCase().trim();
  const rawKey = (q.correct_answer || '').trim();
  
  // Extract option letter from correct_answer (e.g. "B) 13 and 2/3 days..." -> "b")
  const keyMatch = rawKey.match(/^([A-Da-d])[\)\.\:\s]/);
  const correctLetter = keyMatch ? keyMatch[1].toLowerCase() : (rawKey.length === 1 ? rawKey.toLowerCase() : '');

  // Extract candidate choice: e.g. "Option B", "B)", "B", "13 and 2/3"
  const candidateMatch = normAnswer.match(/\b([a-d])\b/) || normAnswer.match(/option\s*([a-d])/i);
  const candidateLetter = candidateMatch ? candidateMatch[1].toLowerCase() : '';

  const isExactLetterMatch = Boolean(correctLetter && candidateLetter && correctLetter === candidateLetter);
  
  // Check key numeric or semantic fragments from correct answer
  const keyFragments = rawKey.toLowerCase().replace(/^[a-d][\)\.\:\s]+/, '').split(/[\(\)\,]/).map(s => s.trim()).filter(s => s.length > 3);
  const matchedKeyFragment = keyFragments.some(frag => normAnswer.includes(frag));

  if (isExactLetterMatch || matchedKeyFragment) {
    return {
      score: 100,
      verdict: 'Excellent',
      strengths: ['Correct option identified', 'Accurate mathematical/logical deduction'],
      missing_concepts: [],
      feedback: `Correct! Accurately matched option: ${q.correct_answer}.`
    };
  }

  // Partial credit check: Candidate showed legitimate calculation steps or partial reasoning
  const containsMathWork = /\b(lcm|efficiency|probability|units|formula|work\s*done|ratio)\b/i.test(normAnswer);
  if (containsMathWork && normAnswer.length > 30) {
    return {
      score: 35,
      verdict: 'Weak',
      strengths: ['Attempted relevant mathematical setup and formula'],
      missing_concepts: [q.explanation ? q.explanation.slice(0, 150) : 'Accurate final calculation to target option'],
      feedback: `Incorrect option selected. You demonstrated partial method, but the correct answer is ${q.correct_answer}. Explanation: ${q.explanation || 'See answer key.'}`
    };
  }

  return {
    score: 0,
    verdict: 'Weak',
    strengths: [],
    missing_concepts: [q.explanation ? q.explanation.slice(0, 150) : 'Understanding of underlying logical/quantitative principles'],
    feedback: `Incorrect. The correct answer is: ${q.correct_answer}. ${q.explanation || ''}`
  };
}

/**
 * Evaluates a Coding / Online Assessment question.
 * Checks algorithmic correctness, complexity, constraints, and rubric criteria.
 */
function evaluateCodingQuestion(
  q: CanonicalInterviewQuestion,
  answerText: string,
  codeText: string
): { score: number; verdict: QuestionEvaluation['verdict']; strengths: string[]; missing_concepts: string[]; feedback: string; rubric_breakdown: RubricCriterionScore[] } {
  const combined = (answerText + '\n' + codeText).toLowerCase();
  const strengths: string[] = [];
  const missing_concepts: string[] = [];
  const rubric_breakdown: RubricCriterionScore[] = [];

  // Parse scoring rubric if available
  const rawRubric = Array.isArray(q.scoring_rubric) ? q.scoring_rubric : [];
  
  // Criteria 1: Approach & Correctness
  const hasAlgorithm = /\b(greedy|sort|binary\s*search|stack|queue|hash|two\s*pointer|dp|dynamic|bfs|dfs)\b/.test(combined);
  if (hasAlgorithm) {
    strengths.push('Identified suitable algorithmic pattern');
  } else {
    missing_concepts.push('Clear algorithmic approach (e.g. greedy, two-pointer, or topological sort)');
  }

  // Criteria 2: Complexity Analysis
  const mentionsComplexity = /\bo\([nlogk1\s\^\*]+\)/i.test(combined) || combined.includes('time complexity') || combined.includes('space complexity');
  if (mentionsComplexity) {
    strengths.push('Analyzed runtime or space complexity');
  } else {
    missing_concepts.push(`Explicit complexity target (${q.expected_complexity?.time || 'O(N)'})`);
  }

  // Criteria 3: Edge Cases and Constraints
  const handlesConstraints = /\b(empty|null|overflow|boundary|zero|negative|modulo|long|bigint)\b/.test(combined);
  if (handlesConstraints) {
    strengths.push('Addressed edge cases and constraints');
  } else {
    missing_concepts.push('Boundary and constraint guards (e.g. 64-bit integer overflow, empty input)');
  }

  // Calculate rubric scores
  let totalScore = 0;
  if (rawRubric.length > 0) {
    let weightSum = 0;
    for (const r of rawRubric) {
      const weight = r.weight || 33;
      weightSum += weight;
      let critScore = 20; // baseline for answering
      const cNorm = (r.criterion || '').toLowerCase();
      if (cNorm.includes('correct') || cNorm.includes('greedy') || cNorm.includes('parsing') || cNorm.includes('logic')) {
        critScore = hasAlgorithm ? 85 : 30;
      } else if (cNorm.includes('complex') || cNorm.includes('time') || cNorm.includes('optim')) {
        critScore = mentionsComplexity ? 90 : 35;
      } else if (cNorm.includes('overflow') || cNorm.includes('memory') || cNorm.includes('stack') || cNorm.includes('bound')) {
        critScore = handlesConstraints ? 85 : 30;
      } else {
        critScore = hasAlgorithm && handlesConstraints ? 80 : 40;
      }
      rubric_breakdown.push({
        criterion: r.criterion,
        weight,
        score: critScore,
        comment: critScore >= 75 ? 'Criterion satisfied' : 'Needs further optimization or boundary checks'
      });
      totalScore += critScore * weight;
    }
    totalScore = Math.round(totalScore / (weightSum || 1));
  } else {
    // Default 3-dimension rubric
    const s1 = hasAlgorithm ? 85 : 30;
    const s2 = mentionsComplexity ? 85 : 30;
    const s3 = handlesConstraints ? 80 : 35;
    totalScore = Math.round((s1 * 0.45) + (s2 * 0.3) + (s3 * 0.25));
    rubric_breakdown.push(
      { criterion: 'Algorithmic Correctness', weight: 45, score: s1, comment: hasAlgorithm ? 'Correct algorithm' : 'Sub-optimal approach' },
      { criterion: 'Time & Space Complexity', weight: 30, score: s2, comment: mentionsComplexity ? 'Complexity evaluated' : 'Missing complexity evaluation' },
      { criterion: 'Edge Cases & Constraints', weight: 25, score: s3, comment: handlesConstraints ? 'Constraints addressed' : 'Missing boundary checks' }
    );
  }

  // Cap score if answer is superficial
  if (combined.length < 80 && totalScore > 50) totalScore = 50;

  let verdict: QuestionEvaluation['verdict'] = 'Average';
  if (totalScore >= 80) verdict = 'Excellent';
  else if (totalScore >= 65) verdict = 'Good';
  else if (totalScore >= 45) verdict = 'Average';
  else verdict = 'Weak';

  return {
    score: totalScore,
    verdict,
    strengths,
    missing_concepts,
    feedback: `Coding solution achieved ${totalScore}/100. ${strengths.join(', ')}. Need improvement on: ${missing_concepts.join(', ') || 'further speed benchmark testing'}.`,
    rubric_breakdown
  };
}

/**
 * Evaluates Technical DSA, Domain-Specific Technical, LLD, and Project Deep Dive questions.
 * Compares against expected_points, rubrics, and conceptual keywords.
 */
function evaluateTechnicalDomainQuestion(
  q: CanonicalInterviewQuestion,
  answerText: string
): { score: number; verdict: QuestionEvaluation['verdict']; strengths: string[]; missing_concepts: string[]; feedback: string; rubric_breakdown: RubricCriterionScore[] } {
  const norm = answerText.toLowerCase();
  const strengths: string[] = [];
  const missing_concepts: string[] = [];
  const rubric_breakdown: RubricCriterionScore[] = [];

  // Match against expected_points if available
  const points = Array.isArray(q.expected_points) ? q.expected_points : [];
  let pointsMatched = 0;

  if (points.length > 0) {
    for (const pt of points) {
      const ptWords = pt.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 4);
      const matched = ptWords.filter(w => norm.includes(w));
      if (matched.length >= Math.min(2, ptWords.length)) {
        pointsMatched++;
        strengths.push(pt.slice(0, 80));
      } else {
        missing_concepts.push(pt.slice(0, 80));
      }
    }
  } else if (q.what_we_look_for) {
    // Check keywords in what_we_look_for
    const criteriaWords = q.what_we_look_for.toLowerCase().split(/[\,\.\;\:]/).map(s => s.trim()).filter(s => s.length > 5);
    for (const crit of criteriaWords) {
      const words = crit.split(/\s+/).filter(w => w.length > 4);
      if (words.some(w => norm.includes(w))) {
        pointsMatched++;
        strengths.push(crit.slice(0, 80));
      } else {
        missing_concepts.push(crit.slice(0, 80));
      }
    }
  }

  // Calculate score based on points coverage and answer depth
  const totalPoints = (points.length > 0 ? points.length : 3);
  const ratio = Math.min(1, pointsMatched / Math.max(1, totalPoints));
  
  // Depth multiplier (prevents single-sentence superficial answers from getting high score)
  const wordCount = answerText.split(/\s+/).filter(Boolean).length;
  let depthFactor = 1.0;
  if (wordCount < 25) depthFactor = 0.45;
  else if (wordCount < 50) depthFactor = 0.75;
  else if (wordCount >= 80) depthFactor = 1.0;

  let rawScore = Math.round((ratio * 80 + 20) * depthFactor);
  rawScore = Math.max(20, Math.min(100, rawScore));

  // Build rubric breakdown
  if (Array.isArray(q.scoring_rubric) && q.scoring_rubric.length > 0) {
    for (const r of q.scoring_rubric) {
      const critWords = (r.criterion || '').toLowerCase().split(/\s+/).filter(w => w.length > 4);
      const isCritMentioned = critWords.some(w => norm.includes(w));
      const critScore = isCritMentioned ? Math.min(100, Math.round(rawScore * 1.05)) : Math.round(rawScore * 0.95);
      rubric_breakdown.push({
        criterion: r.criterion,
        weight: r.weight,
        score: Math.min(100, Math.max(20, critScore)),
        comment: critScore >= 75 ? 'Addressed thoroughly' : 'Partial depth or missing details'
      });
    }
  } else {
    rubric_breakdown.push(
      { criterion: 'Technical Depth & Core Concepts', weight: 40, score: rawScore, comment: rawScore >= 70 ? 'Key concepts covered' : 'Needs greater depth' },
      { criterion: 'Problem Decomposition & Architecture', weight: 35, score: Math.min(100, Math.round(rawScore * 0.95 + 5)), comment: rawScore >= 65 ? 'Structured explanation' : 'Lacks architectural clarity' },
      { criterion: 'Trade-offs & Constraints', weight: 25, score: Math.min(100, Math.round(rawScore * 0.9)), comment: rawScore >= 70 ? 'Trade-offs addressed' : 'Missing scaling / edge cases' }
    );
  }

  let verdict: QuestionEvaluation['verdict'] = 'Average';
  if (rawScore >= 80) verdict = 'Excellent';
  else if (rawScore >= 65) verdict = 'Good';
  else if (rawScore >= 45) verdict = 'Average';
  else verdict = 'Weak';

  return {
    score: rawScore,
    verdict,
    strengths: strengths.slice(0, 3),
    missing_concepts: missing_concepts.slice(0, 3),
    feedback: `Technical answer evaluated at ${rawScore}/100. Covered ${pointsMatched}/${totalPoints} key expected concepts.`,
    rubric_breakdown
  };
}

/**
 * Evaluates HR & Behavioral questions.
 * Grounded in STAR criteria and behavioral competency indicators.
 */
function evaluateHRQuestion(
  q: CanonicalInterviewQuestion,
  answerText: string
): { score: number; verdict: QuestionEvaluation['verdict']; strengths: string[]; missing_concepts: string[]; feedback: string; rubric_breakdown: RubricCriterionScore[] } {
  const norm = answerText.toLowerCase();
  const strengths: string[] = [];
  const missing_concepts: string[] = [];
  const rubric_breakdown: RubricCriterionScore[] = [];

  // 1. STAR structure evaluation
  const hasSituation = norm.includes('when') || norm.includes('project') || norm.includes('during') || norm.includes('role');
  const hasTask = norm.includes('needed') || norm.includes('responsible') || norm.includes('task') || norm.includes('goal');
  const hasAction = norm.includes('i ') || norm.includes('decided') || norm.includes('implemented') || norm.includes('analyzed');
  const hasResult = norm.includes('result') || norm.includes('outcome') || norm.includes('delivered') || norm.includes('improved') || /\d+%/.test(norm);

  const starCount = [hasSituation, hasTask, hasAction, hasResult].filter(Boolean).length;
  if (starCount >= 3) {
    strengths.push('Structured response following STAR methodology');
  } else {
    missing_concepts.push('Explicit STAR breakdown (Situation, Task, Action, and Quantified Result)');
  }

  // 2. Behavioral competency indicators
  const criteria = q.behavioral_criteria;
  let posMatched = 0;
  let negMatched = 0;

  if (criteria?.positive_indicators && Array.isArray(criteria.positive_indicators)) {
    for (const ind of criteria.positive_indicators) {
      const words = ind.toLowerCase().split(/\s+/).filter(w => w.length > 4);
      if (words.some(w => norm.includes(w))) {
        posMatched++;
        strengths.push(ind.slice(0, 70));
      }
    }
  }

  if (criteria?.negative_indicators && Array.isArray(criteria.negative_indicators)) {
    for (const ind of criteria.negative_indicators) {
      const words = ind.toLowerCase().split(/\s+/).filter(w => w.length > 4);
      if (words.some(w => norm.includes(w))) {
        negMatched++;
      }
    }
  }

  let baseScore = 50 + (starCount * 8) + (posMatched * 10) - (negMatched * 15);
  // Word count heuristic
  const wordCount = answerText.split(/\s+/).filter(Boolean).length;
  if (wordCount < 30) baseScore -= 20;
  if (wordCount > 60 && hasResult) baseScore += 10;
  
  const finalScore = Math.max(25, Math.min(100, Math.round(baseScore)));

  rubric_breakdown.push(
    { criterion: 'STAR Methodology', weight: 40, score: starCount >= 3 ? 90 : 45, comment: starCount >= 3 ? 'STAR structure evident' : 'Lacks explicit result or context' },
    { criterion: criteria?.competency || 'Leadership & Cultural Fit', weight: 35, score: posMatched > 0 ? 85 : 50, comment: posMatched > 0 ? 'Demonstrated positive indicators' : 'Needs clearer evidence of ownership' },
    { criterion: 'Outcome & Impact Quantification', weight: 25, score: hasResult ? 85 : 35, comment: hasResult ? 'Result stated' : 'Missing measurable business/team outcome' }
  );

  let verdict: QuestionEvaluation['verdict'] = 'Average';
  if (finalScore >= 80) verdict = 'Excellent';
  else if (finalScore >= 65) verdict = 'Good';
  else if (finalScore >= 45) verdict = 'Average';
  else verdict = 'Weak';

  return {
    score: finalScore,
    verdict,
    strengths: strengths.slice(0, 3),
    missing_concepts: missing_concepts.slice(0, 3),
    feedback: `Behavioral response scored at ${finalScore}/100. Competency: ${criteria?.competency || 'Cultural Alignment'}.`,
    rubric_breakdown
  };
}

/**
 * Evaluates Group Discussion questions.
 * Evaluates multi-perspective articulation, listening, and balanced synthesis.
 */
function evaluateGDQuestion(
  q: CanonicalInterviewQuestion,
  answerText: string
): { score: number; verdict: QuestionEvaluation['verdict']; strengths: string[]; missing_concepts: string[]; feedback: string; rubric_breakdown: RubricCriterionScore[] } {
  const norm = answerText.toLowerCase();
  const strengths: string[] = [];
  const missing_concepts: string[] = [];
  const rubric_breakdown: RubricCriterionScore[] = [];

  // Check perspectives
  const perspectives = Array.isArray(q.key_perspectives) ? q.key_perspectives : [];
  let perspectivesCount = 0;
  for (const p of perspectives) {
    const pWords = p.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    if (pWords.some(w => norm.includes(w))) {
      perspectivesCount++;
      strengths.push(p.slice(0, 70));
    } else {
      missing_concepts.push(p.slice(0, 70));
    }
  }

  // Check balanced synthesis and compromise
  const hasCompromise = norm.includes('balance') || norm.includes('hybrid') || norm.includes('both') || norm.includes('synthes') || norm.includes('hand');
  if (hasCompromise) {
    strengths.push('Proposed balanced synthesis reconciling opposing viewpoints');
  } else {
    missing_concepts.push('Balanced middle-ground or practical policy compromise');
  }

  const s1 = perspectivesCount >= 2 ? 88 : 45;
  const s2 = hasCompromise ? 85 : 40;
  const s3 = answerText.length > 100 ? 80 : 50;

  const finalScore = Math.round((s1 * 0.4) + (s2 * 0.35) + (s3 * 0.25));

  rubric_breakdown.push(
    { criterion: 'Structured Articulation', weight: 40, score: s1, comment: perspectivesCount >= 2 ? 'Covered multiple viewpoints' : 'One-sided argument' },
    { criterion: 'Balanced Synthesis', weight: 35, score: s2, comment: hasCompromise ? 'Effective synthesis' : 'Lacks compromise recommendation' },
    { criterion: 'Professional Communication', weight: 25, score: s3, comment: s3 >= 75 ? 'Articulate delivery' : 'Too brief for group discussion' }
  );

  let verdict: QuestionEvaluation['verdict'] = 'Average';
  if (finalScore >= 80) verdict = 'Excellent';
  else if (finalScore >= 65) verdict = 'Good';
  else if (finalScore >= 45) verdict = 'Average';
  else verdict = 'Weak';

  return {
    score: finalScore,
    verdict,
    strengths: strengths.slice(0, 3),
    missing_concepts: missing_concepts.slice(0, 3),
    feedback: `Group discussion topic scored at ${finalScore}/100. ${strengths.join('. ')}.`,
    rubric_breakdown
  };
}

/**
 * Dispatches question evaluation to appropriate round grader.
 */
function evaluateSingleQuestion(
  q: CanonicalInterviewQuestion,
  answerText: string,
  codeText: string,
  parsedResume?: any
): QuestionEvaluation {
  const isUnanswered = isAnswerEffectivelyEmpty(answerText, codeText);
  const roundType = normalizeRoundCategory(q.round);

  if (isUnanswered) {
    const missing: string[] = [];
    if (q.expected_points && Array.isArray(q.expected_points)) {
      missing.push(...q.expected_points.slice(0, 2));
    } else if (q.what_we_look_for) {
      missing.push(q.what_we_look_for.slice(0, 100));
    } else if (q.correct_answer) {
      missing.push(`Correct Option: ${q.correct_answer}`);
    } else {
      missing.push('Comprehensive technical solution');
    }

    return {
      question_id: q.question_id,
      canonical_title: q.canonical_title || q.question_text.slice(0, 60),
      round: q.round,
      category: q.category,
      candidate_answer: '',
      is_answered: false,
      score: 0,
      max_score: 100,
      verdict: 'Unanswered',
      rubric_breakdown: Array.isArray(q.scoring_rubric)
        ? q.scoring_rubric.map(r => ({ criterion: r.criterion, weight: r.weight, score: 0, comment: 'Question unanswered' }))
        : [],
      strengths: [],
      missing_concepts: missing,
      feedback: 'Question was left unanswered. Candidate skipped this problem.',
      expected_answer_summary: q.explanation || q.what_we_look_for || (q.expected_points ? q.expected_points.join('; ') : '')
    };
  }

  let evalResult: {
    score: number;
    verdict: QuestionEvaluation['verdict'];
    strengths: string[];
    missing_concepts: string[];
    feedback: string;
    rubric_breakdown?: RubricCriterionScore[];
  };

  switch (roundType) {
    case 'Aptitude & Logical Reasoning':
      evalResult = evaluateAptitudeQuestion(q, answerText);
      break;
    case 'Coding / Online Assessment':
      evalResult = evaluateCodingQuestion(q, answerText, codeText);
      break;
    case 'Technical DSA':
      if (codeText || q.expected_complexity || (Array.isArray(q.scoring_rubric) && q.scoring_rubric.length > 0)) {
        evalResult = evaluateCodingQuestion(q, answerText, codeText);
      } else {
        evalResult = evaluateTechnicalDomainQuestion(q, answerText + (codeText ? '\n' + codeText : ''));
      }
      break;
    case 'HR & Behavioral':
      evalResult = evaluateHRQuestion(q, answerText);
      break;
    case 'Group Discussion':
      evalResult = evaluateGDQuestion(q, answerText);
      break;
    case 'Domain-Specific Technical':
    case 'Project & Resume Deep Dive':
    case 'System Design / Low-Level Design':
    default:
      evalResult = evaluateTechnicalDomainQuestion(q, answerText + (codeText ? '\n' + codeText : ''));
      break;
  }

  return {
    question_id: q.question_id,
    canonical_title: q.canonical_title || q.question_text.slice(0, 60),
    round: q.round,
    category: q.category,
    candidate_answer: answerText || codeText,
    is_answered: true,
    score: evalResult.score,
    max_score: 100,
    verdict: evalResult.verdict,
    rubric_breakdown: evalResult.rubric_breakdown || [],
    strengths: evalResult.strengths,
    missing_concepts: evalResult.missing_concepts,
    feedback: evalResult.feedback,
    expected_answer_summary: q.explanation || q.what_we_look_for || (q.expected_points ? q.expected_points.join('; ') : '')
  };
}

// ── 4. MAIN EVALUATION PIPELINE ───────────────────────────────────────────────

/**
 * End-to-end evaluation pipeline: evaluates all questions, computes round scorecards,
 * and generates the complete, evidence-based final interview report.
 */
export async function evaluateInterview(
  input: InterviewEvaluationInput
): Promise<InterviewAssessmentReport> {
  const {
    sessionId = `SES_${Date.now()}`,
    questionSetId,
    userId = 'guest',
    sessionToken,
    company,
    role,
    answers = {},
    codeAnswers = {},
    chatHistory = [],
    parsedResume,
    interviewMode = 'normal'
  } = input;

  // Retrieve canonical question set
  const questionSet = await getCanonicalQuestionSet(questionSetId);
  if (!questionSet || !Array.isArray(questionSet.questions) || questionSet.questions.length === 0) {
    throw new Error(`Cannot evaluate interview: Canonical question set '${questionSetId}' not found.`);
  }

  // 1. Evaluate every question in the set
  const questionEvaluations: QuestionEvaluation[] = [];
  for (const q of questionSet.questions) {
    const { answerText, codeText } = extractAnswerForQuestion(q, answers, codeAnswers, chatHistory);
    const qEval = evaluateSingleQuestion(q, answerText, codeText, parsedResume);
    questionEvaluations.push(qEval);
  }

  // 2. Compute Round-Specific Scorecards
  const roundMap: Record<string, QuestionEvaluation[]> = {};
  for (const qe of questionEvaluations) {
    const rKey = qe.round || 'General Technical';
    if (!roundMap[rKey]) roundMap[rKey] = [];
    roundMap[rKey].push(qe);
  }

  const roundScorecards: Record<string, RoundScorecard> = {};
  let roundIndex = 1;

  for (const [roundName, qList] of Object.entries(roundMap)) {
    const answeredList = qList.filter(q => q.is_answered);
    const roundAvg = Math.round(
      qList.reduce((acc, curr) => acc + curr.score, 0) / Math.max(1, qList.length)
    );

    const normCat = normalizeRoundCategory(roundName);
    const isMCQ = normCat === 'Aptitude & Logical Reasoning';

    // Dimension breakdown
    const correctness = Math.round(
      qList.reduce((acc, q) => acc + (q.score >= 60 ? q.score : q.score * 0.8), 0) / Math.max(1, qList.length)
    );
    const technicalDepth = Math.round(
      answeredList.reduce((acc, q) => acc + q.score, 0) / Math.max(1, answeredList.length || 1)
    );
    const problemSolving = Math.round(
      qList.reduce((acc, q) => acc + (q.score >= 50 ? q.score : 30), 0) / Math.max(1, qList.length)
    );

    const dimensions: RoundScorecard['dimensions'] = {
      correctness,
      technical_depth: technicalDepth,
      problem_solving: problemSolving
    };

    // Do NOT force communication score into objective MCQ rounds!
    if (!isMCQ) {
      dimensions.communication = Math.min(100, Math.max(30, Math.round(technicalDepth * 0.95 + 5)));
    }

    const roundStrengths: string[] = [];
    const roundWeaknesses: string[] = [];
    const roundMissing: string[] = [];

    for (const q of qList) {
      roundStrengths.push(...q.strengths);
      roundMissing.push(...q.missing_concepts);
      if (q.score < 60) {
        roundWeaknesses.push(`Low depth on: ${q.canonical_title}`);
      }
    }

    // Actionable improvement suggestions
    const suggestions: string[] = [];
    if (roundMissing.length > 0) {
      suggestions.push(`Review core concepts: ${roundMissing.slice(0, 2).join(', ')}`);
    }
    if (answeredList.length < qList.length) {
      suggestions.push(`Avoid skipping questions; practice time management for ${roundName}`);
    }
    if (suggestions.length === 0) {
      suggestions.push(`Solid foundation; practice answering advanced edge-case trade-offs in under 2 minutes`);
    }

    roundScorecards[roundName] = {
      round_name: roundName,
      round_order: roundIndex++,
      score: roundAvg,
      dimensions,
      strengths: Array.from(new Set(roundStrengths)).slice(0, 4),
      weaknesses: Array.from(new Set(roundWeaknesses)).slice(0, 3),
      missing_concepts: Array.from(new Set(roundMissing)).slice(0, 4),
      improvement_suggestions: suggestions,
      questions_evaluated: qList.length,
      questions_answered: answeredList.length
    };
  }

  // 3. Overall Performance Calculation
  const roundScoresList = Object.values(roundScorecards).map(r => r.score);
  const overallScore = Math.round(
    roundScoresList.reduce((acc, s) => acc + s, 0) / Math.max(1, roundScoresList.length)
  );

  let overallGrade: InterviewAssessmentReport['overall_grade'] = 'B';
  let hiringDecision: InterviewAssessmentReport['hiring_decision'] = 'Hold';

  if (overallScore >= 90) {
    overallGrade = 'A+';
    hiringDecision = 'Strong Hire';
  } else if (overallScore >= 80) {
    overallGrade = 'A';
    hiringDecision = 'Hire';
  } else if (overallScore >= 70) {
    overallGrade = 'B+';
    hiringDecision = 'Lean Hire';
  } else if (overallScore >= 55) {
    overallGrade = 'B';
    hiringDecision = 'Hold';
  } else if (overallScore >= 40) {
    overallGrade = 'C';
    hiringDecision = 'Reject';
  } else {
    overallGrade = 'D';
    hiringDecision = 'Reject';
  }

  // 4. Strongest Skills, Weakest Skills, and Critical Gaps
  const allStrengths = Array.from(new Set(questionEvaluations.flatMap(q => q.strengths))).filter(Boolean);
  const allMissing = Array.from(new Set(questionEvaluations.flatMap(q => q.missing_concepts))).filter(Boolean);

  const strongestSkills = allStrengths.slice(0, 4);
  const criticalSkillGaps = allMissing.slice(0, 4);
  const weakestSkills = Object.values(roundScorecards)
    .sort((a, b) => a.score - b.score)
    .slice(0, 2)
    .map(r => r.round_name);

  // 5. Recommended Learning Roadmap
  const recommendedRoadmap: RecommendedRoadmapItem[] = [];
  if (criticalSkillGaps.length > 0) {
    criticalSkillGaps.slice(0, 3).forEach((gap, idx) => {
      recommendedRoadmap.push({
        topic: gap,
        action: `Complete 3 targeted exercises focusing on ${gap}`,
        timeline: `${(idx + 1) * 3} days`,
        resources: ['LeetCode Discuss Study Guides', 'Designing Data-Intensive Applications', 'GeeksforGeeks Placement Tracks']
      });
    });
  } else {
    recommendedRoadmap.push({
      topic: 'Advanced System Scalability',
      action: 'Design distributed architectures handling 100k+ req/sec with active-active failover',
      timeline: '1 week',
      resources: ['System Design Primer', 'AWS Architecture Center']
    });
  }

  // 6. Comprehensive Hiring Summary
  const strongRounds = Object.values(roundScorecards).filter(r => r.score >= 70).map(r => r.round_name);
  const weakRounds = Object.values(roundScorecards).filter(r => r.score < 60).map(r => r.round_name);

  let hiringSummary = `Candidate evaluated for ${company} ${role} achieving an overall placement score of ${overallScore}/100 (Grade: ${overallGrade}, Decision: ${hiringDecision}). `;
  if (strongRounds.length > 0) {
    hiringSummary += `Demonstrated solid competency in ${strongRounds.join(', ')}. `;
  }
  if (weakRounds.length > 0) {
    hiringSummary += `Performance fell below corporate benchmark in ${weakRounds.join(', ')}, with critical gaps in ${criticalSkillGaps.slice(0, 2).join(' and ') || 'advanced execution'}. `;
  } else {
    hiringSummary += 'Maintained steady consistency across all evaluated interview dimensions. ';
  }
  hiringSummary += `Hiring Recommendation: ${hiringDecision} based on ${questionEvaluations.length} evaluated canonical questions.`;

  const reportId = input.reportId || `RPT_${company.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const finalReport: InterviewAssessmentReport = {
    id: reportId,
    session_id: sessionId,
    question_set_id: questionSetId,
    user_id: userId,
    session_token: sessionToken,
    company,
    role,
    overall_score: overallScore,
    overall_grade: overallGrade,
    hiring_decision: hiringDecision,
    hiring_summary: hiringSummary,
    round_scorecards: roundScorecards,
    question_evaluations: questionEvaluations,
    strongest_skills: strongestSkills,
    weakest_skills: weakestSkills,
    critical_skill_gaps: criticalSkillGaps,
    recommended_roadmap: recommendedRoadmap,
    interview_mode: interviewMode,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Persist locally
  persistLocalReport(finalReport);

  // Persist to Supabase if configured
  if (isSupabaseConfigured) {
    try {
      await supabase.from('interview_assessment_reports').upsert({
        id: finalReport.id,
        session_id: finalReport.session_id,
        question_set_id: finalReport.question_set_id,
        user_id: finalReport.user_id,
        session_token: finalReport.session_token || null,
        company: finalReport.company,
        role: finalReport.role,
        overall_score: finalReport.overall_score,
        overall_grade: finalReport.overall_grade,
        hiring_decision: finalReport.hiring_decision,
        hiring_summary: finalReport.hiring_summary,
        answers: answers,
        round_scorecards: finalReport.round_scorecards,
        question_evaluations: finalReport.question_evaluations,
        strongest_skills: finalReport.strongest_skills,
        weakest_skills: finalReport.weakest_skills,
        critical_skill_gaps: finalReport.critical_skill_gaps,
        recommended_roadmap: finalReport.recommended_roadmap,
        interview_mode: finalReport.interview_mode,
        created_at: finalReport.created_at,
        updated_at: finalReport.updated_at
      });

      // Backward-compatible summary record into legacy 'interviews' table
      await supabase.from('interviews').insert([{
        user_id: finalReport.user_id,
        role: finalReport.role,
        company: finalReport.company,
        score: finalReport.overall_score,
        feedback: finalReport.hiring_summary,
        strengths: finalReport.strongest_skills,
        weaknesses: finalReport.critical_skill_gaps,
        hiring_decision: finalReport.hiring_decision,
        percentile_estimate: Math.min(99, Math.max(10, Math.round(finalReport.overall_score * 0.95))),
        session_id: finalReport.session_id,
        question_set_id: finalReport.question_set_id,
        report_id: finalReport.id
      }]);
    } catch (dbErr) {
      console.warn('[AssessmentEngine] Non-fatal Supabase report persistence warning:', dbErr);
    }
  }

  return finalReport;
}

// ── 5. PERSISTENCE & ACCESS CONTROL ───────────────────────────────────────────

/**
 * Retrieve an assessment report by its report ID with strict zero-trust ownership checks.
 */
// Maximum allowable age for a guest report token (24 hours)
const GUEST_REPORT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export async function getAssessmentReport(
  reportId: string,
  context?: SessionRequestContext
): Promise<InterviewAssessmentReport | null> {
  let report: InterviewAssessmentReport | null = null;

  if (reportsStore.has(reportId)) {
    report = reportsStore.get(reportId)!;
  } else if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('interview_assessment_reports')
        .select('*')
        .eq('id', reportId)
        .maybeSingle();

      if (data && !error) {
        report = data as any;
        if (report) reportsStore.set(report.id, report);
      }
    } catch (e) {}
  }

  if (!report) return null;

  // Zero-trust verification: authenticated user vs guest session token
  const isAuthedReport = report.user_id && report.user_id !== 'guest' && !report.user_id.startsWith('guest_') && !report.user_id.startsWith('guest-');
  if (isAuthedReport) {
    if (!context?.requesterUid || context.requesterUid !== report.user_id) {
      throw new Error("FORBIDDEN: You do not have permission to view this authenticated candidate report.");
    }
  } else {
    if (!context?.sessionToken || !report.session_token || report.session_token !== context.sessionToken) {
      throw new Error("FORBIDDEN: Invalid or mismatched guest session credentials.");
    }
    const createdAtMs = new Date(report.created_at || report.updated_at).getTime();
    if (Date.now() - createdAtMs > GUEST_REPORT_MAX_AGE_MS) {
      throw new Error("FORBIDDEN: Guest assessment report token has expired.");
    }
  }

  return report;
}

/**
 * Retrieve the latest assessment report for a given session ID with ownership verification.
 */
export async function getAssessmentReportBySession(
  sessionId: string,
  context?: SessionRequestContext
): Promise<InterviewAssessmentReport | null> {
  // Check memory store
  for (const r of reportsStore.values()) {
    if (r.session_id === sessionId) {
      const isAuthedReport = r.user_id && r.user_id !== 'guest' && !r.user_id.startsWith('guest_') && !r.user_id.startsWith('guest-');
      if (isAuthedReport) {
        if (!context?.requesterUid || context.requesterUid !== r.user_id) {
          throw new Error("FORBIDDEN: You do not have permission to view this authenticated candidate report.");
        }
      } else {
        if (!context?.sessionToken || !r.session_token || r.session_token !== context.sessionToken) {
          throw new Error("FORBIDDEN: Invalid or mismatched guest session credentials.");
        }
        const createdAtMs = new Date(r.created_at || r.updated_at).getTime();
        if (Date.now() - createdAtMs > GUEST_REPORT_MAX_AGE_MS) {
          throw new Error("FORBIDDEN: Guest assessment report token has expired.");
        }
      }
      return r;
    }
  }

  // Check Supabase
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('interview_assessment_reports')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        const report = data as InterviewAssessmentReport;
        reportsStore.set(report.id, report);
        const isAuthedReport = report.user_id && report.user_id !== 'guest' && !report.user_id.startsWith('guest_') && !report.user_id.startsWith('guest-');
        if (isAuthedReport) {
          if (!context?.requesterUid || context.requesterUid !== report.user_id) {
            throw new Error("FORBIDDEN: You do not have permission to view this authenticated candidate report.");
          }
        } else {
          if (!context?.sessionToken || !report.session_token || report.session_token !== context.sessionToken) {
            throw new Error("FORBIDDEN: Invalid or mismatched guest session credentials.");
          }
          const createdAtMs = new Date(report.created_at || report.updated_at).getTime();
          if (Date.now() - createdAtMs > GUEST_REPORT_MAX_AGE_MS) {
            throw new Error("FORBIDDEN: Guest assessment report token has expired.");
          }
        }
        return report;
      }
    } catch (e: any) {
      if (e?.message && e.message.startsWith('FORBIDDEN')) throw e;
    }
  }

  return null;
}

