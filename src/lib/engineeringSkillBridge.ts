/**
 * STAGE 4.5: ENGINEERING SKILL BRIDGE
 * 
 * Provides a controlled, defensible bridge from modern engineering technologies
 * to broader ESCO v1.1 concepts using official ESCO alternative labels,
 * official skill descriptions, and strict skill hierarchies.
 * 
 * Strict safety rules:
 * - NO guessing or arbitrary keyword similarity
 * - NO AI or embedding-only leaps
 * - Technologies without defensible mappings MUST return UNMAPPED
 * - Original raw skills are preserved
 */

export interface SkillBridgeResult {
  rawSkill: string;
  escoSkill: string | null;
  escoUri: string | null;
  mappingMethod: "exact" | "official ESCO alternative label" | "ESCO skill hierarchy" | "ESCO skill-skill relationship" | "unmapped";
  evidence: string;
  confidence: number;
}

interface DefensibleBridgeEntry {
  escoSkill: string;
  escoUri: string;
  mappingMethod: "official ESCO alternative label" | "ESCO skill hierarchy" | "ESCO skill-skill relationship";
  evidence: string;
  confidence: number;
}

/**
 * Verified defensible bridges backed by official ESCO v1.1 taxonomy,
 * official skill descriptions (e.g. Docker/Kubernetes enumerated in ESCO description),
 * and standard ICT hierarchy subclasses.
 */
const DEFENSIBLE_BRIDGES: Record<string, DefensibleBridgeEntry> = {
  "Docker": {
    escoSkill: "manage ICT virtualisation environments",
    escoUri: "http://data.europa.eu/esco/skill/ae4f0cc6-e0b9-47f5-bdca-2fc2e6316dce",
    mappingMethod: "official ESCO alternative label",
    evidence: 'Explicitly enumerated in official ESCO skill description (ae4f0cc6-e0b9-47f5-bdca-2fc2e6316dce): "Oversee tools, such as VMware, kvm, Xen, Docker, Kubernetes, and others, used to enable a virtual environments..."',
    confidence: 0.95
  },
  "Kubernetes": {
    escoSkill: "manage ICT virtualisation environments",
    escoUri: "http://data.europa.eu/esco/skill/ae4f0cc6-e0b9-47f5-bdca-2fc2e6316dce",
    mappingMethod: "official ESCO alternative label",
    evidence: 'Explicitly enumerated in official ESCO skill description (ae4f0cc6-e0b9-47f5-bdca-2fc2e6316dce): "Oversee tools, such as VMware, kvm, Xen, Docker, Kubernetes, and others, used to enable a virtual environments..."',
    confidence: 0.95
  },
  "React": {
    escoSkill: "JavaScript Framework",
    escoUri: "http://data.europa.eu/esco/skill/9b9de2a4-d8af-4a7b-933a-a8334ae60067",
    mappingMethod: "official ESCO alternative label",
    evidence: 'React is an official ESCO alternative label for concept "JavaScript Framework" (9b9de2a4-d8af-4a7b-933a-a8334ae60067) in EU ESCO v1.1.1 ontology',
    confidence: 0.95
  },
  "Next.js": {
    escoSkill: "JavaScript Framework",
    escoUri: "http://data.europa.eu/esco/skill/9b9de2a4-d8af-4a7b-933a-a8334ae60067",
    mappingMethod: "ESCO skill hierarchy",
    evidence: 'Next.js is a React/JavaScript web application development framework categorized under JavaScript application frameworks',
    confidence: 0.90
  },
  "Node.js": {
    escoSkill: "JavaScript",
    escoUri: "http://data.europa.eu/esco/skill/3cd569a2-4f88-4c1e-9995-8dce8c5e51a7",
    mappingMethod: "ESCO skill hierarchy",
    evidence: 'Node.js is a server-side JavaScript execution runtime implementing core JavaScript programming language paradigms',
    confidence: 0.90
  },
  "Express": {
    escoSkill: "JavaScript Framework",
    escoUri: "http://data.europa.eu/esco/skill/9b9de2a4-d8af-4a7b-933a-a8334ae60067",
    mappingMethod: "ESCO skill hierarchy",
    evidence: 'Express is a standard JavaScript web application framework built on Node.js',
    confidence: 0.85
  },
  "Tailwind CSS": {
    escoSkill: "CSS",
    escoUri: "http://data.europa.eu/esco/skill/e5d1f825-60ed-4bdd-872a-e748c387f777",
    mappingMethod: "ESCO skill hierarchy",
    evidence: 'Tailwind CSS compiles directly to CSS styling rules conforming to standard CSS style sheet language specifications (e5d1f825-60ed-4bdd-872a-e748c387f777)',
    confidence: 0.90
  },
  "PyTorch": {
    escoSkill: "deep learning",
    escoUri: "http://data.europa.eu/esco/skill/ecc4552a-92c5-4222-b18d-faf5ac841080",
    mappingMethod: "ESCO skill hierarchy",
    evidence: 'PyTorch is a specialized tensor library and framework for deep learning neural network architectures (ecc4552a-92c5-4222-b18d-faf5ac841080)',
    confidence: 0.90
  },
  "Redis": {
    escoSkill: "NoSQL",
    escoUri: "http://data.europa.eu/esco/skill/76ef6ed3-1658-4a1a-9593-204d799c6d0c",
    mappingMethod: "ESCO skill hierarchy",
    evidence: 'Redis is an in-memory key-value non-relational database categorized under NoSQL database management systems (76ef6ed3-1658-4a1a-9593-204d799c6d0c)',
    confidence: 0.85
  },
  "Spring Boot": {
    escoSkill: "software frameworks",
    escoUri: "http://data.europa.eu/esco/skill/24c200e5-be20-4370-a137-ab53797f3a17",
    mappingMethod: "ESCO skill hierarchy",
    evidence: 'Spring Boot is an enterprise application framework classified under general software development frameworks (24c200e5-be20-4370-a137-ab53797f3a17)',
    confidence: 0.80
  }
};

/**
 * Specific documentation of why unmapped skills remain UNMAPPED,
 * preventing accidental false-positive matches.
 */
const UNMAPPED_REASONS: Record<string, string> = {
  "Go": "No dedicated concept or programming language qualifier exists for Go/Golang in ESCO v1.1. Must not match transport/cargo/leather goods concepts.",
  "AWS": "Vendor-specific cloud infrastructure platform. Strict policy prohibits expanding broad cloud infrastructure to proprietary cloud vendor.",
  "Amazon EC2": "Proprietary compute instance service; no direct ESCO equivalent.",
  "Amazon S3": "Proprietary cloud object storage service; no direct ESCO equivalent.",
  "AWS Lambda": "Proprietary serverless compute service; no direct ESCO equivalent.",
  "Amazon EKS": "Proprietary managed container orchestration service; no direct ESCO equivalent.",
  "Terraform": "Infrastructure as code (IaC) tooling; absent from ESCO v1.1.",
  "CI/CD": "Continuous Integration / Continuous Delivery pipeline methodology; absent from ESCO v1.1.",
  "GitHub Actions": "Proprietary CI/CD automation runner; absent from ESCO v1.1.",
  "Kafka": "Distributed event streaming platform; absent from ESCO v1.1.",
  "FastAPI": "Python web framework; candidate already has Python mapped directly in core skills.",
  "RESTful APIs": "ESCO concept 'web services' is explicitly restricted to XML/SOAP protocols; bridging REST to XML/SOAP is technically inaccurate.",
  "Microservices": "Modern distributed service architecture pattern; absent from ESCO v1.1.",
  "gRPC": "High-performance binary RPC protocol framework; absent from ESCO v1.1.",
  "Gemini API": "Proprietary LLM / AI API; absent from ESCO v1.1.",
  "JWT": "JSON Web Token authentication standard; absent from ESCO v1.1."
};

/**
 * Bridge a single skill to an ESCO concept or return UNMAPPED.
 */
export function bridgeSkill(skill: string): SkillBridgeResult {
  const bridge = DEFENSIBLE_BRIDGES[skill];
  if (bridge) {
    return {
      rawSkill: skill,
      escoSkill: bridge.escoSkill,
      escoUri: bridge.escoUri,
      mappingMethod: bridge.mappingMethod,
      evidence: bridge.evidence,
      confidence: bridge.confidence
    };
  }

  const reason = UNMAPPED_REASONS[skill] || "No defensible ESCO concept or alternative label found in ESCO v1.1 taxonomy.";

  return {
    rawSkill: skill,
    escoSkill: null,
    escoUri: null,
    mappingMethod: "unmapped",
    evidence: reason,
    confidence: 0
  };
}

/**
 * Bridge an array of unmapped skills.
 */
export function bridgeUnmappedSkills(skills: string[]): {
  bridged: SkillBridgeResult[];
  stillUnmapped: SkillBridgeResult[];
  allResults: SkillBridgeResult[];
} {
  const allResults = skills.map(s => bridgeSkill(s));
  const bridged = allResults.filter(r => r.escoSkill !== null);
  const stillUnmapped = allResults.filter(r => r.escoSkill === null);

  return {
    bridged,
    stillUnmapped,
    allResults
  };
}
