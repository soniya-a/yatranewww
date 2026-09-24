export interface IndianCompany {
  id: string;
  name: string;
  category: "MAANG" | "Unicorn" | "Product Startup" | "Enterprise" | "Consulting";
  about: string;
  culture: string;
  salaryRange: string;
  targetRoles: string[];
  requiredSkills: string[];
  transferableMapping: Record<string, string[]>;
  interviewProcess: string[];
  cultureTraits: string[];
}

export const INDIAN_TECH_COMPANIES: IndianCompany[] = [
  {
    id: "comp-google",
    name: "Google India",
    category: "MAANG",
    about: "Google India recruits top-tier engineering talent for Google Search, YouTube, Cloud, and Android engineering hubs in Bangalore and Hyderabad.",
    culture: "Google values Googliness—curiosity, collaboration, pushing technical boundaries, bias-to-action, and intellectual humility.",
    salaryRange: "₹28,000,000 - ₹55,000,000 LPA (Total Compensation)",
    targetRoles: ["Software Engineer", "ML Engineer", "Systems Engineer", "SRE"],
    requiredSkills: ["Algorithms", "Data Structures", "System Design", "Python", "C++", "Java", "Go", "Distributed Systems"],
    transferableMapping: {
      "C++": ["C", "Rust"],
      "Java": ["Kotlin", "C#"],
      "Python": ["Ruby", "R"]
    },
    interviewProcess: ["Online Coding Assessment", "3x Technical DSA Interviews", "1x System Design Interview", "1x Googliness (Leadership & Culture)"],
    cultureTraits: ["Googliness", "Respect", "Diversity", "Open-source Contribution", "First-principles Thinking"]
  },
  {
    id: "comp-amazon",
    name: "Amazon India",
    category: "MAANG",
    about: "Amazon's development centers across Bangalore, Chennai, Hyderabad, and Delhi-NCR build highly scaled worldwide retail supply chain systems, AWS platform nodes, and Kindle services.",
    culture: "Highly obsessed with 16 Leadership Principles, especially Customer Obsession, Ownership, Bias for Action, and Deliver Results.",
    salaryRange: "₹24,000,000 - ₹45,000,000 LPA",
    targetRoles: ["SDE I", "SDE II", "Cloud Support Engineer", "Data Engineer"],
    requiredSkills: ["Java", "C++", "Object-Oriented Design", "SQL", "AWS", "DynamoDB", "Microservices", "Data Structures"],
    transferableMapping: {
      "AWS": ["Azure", "GCP"],
      "Java": ["Spring Boot", "C#"],
      "SQL": ["PostgreSQL", "MySQL"]
    },
    interviewProcess: ["Online Test (Coding + Debugging)", "2x SDE Technical Interviews (OOD & Data Structures)", "1x Bar Raiser Interview (Leadership & Scale)"],
    cultureTraits: ["Customer Obsession", "Ownership", "Bias for Action", "Frugality", "Dive Deep"]
  },
  {
    id: "comp-microsoft",
    name: "Microsoft India",
    category: "MAANG",
    about: "Microsoft India Development Center (IDC) in Hyderabad, Bangalore, and Noida is one of Microsoft's largest R&D centers outside Redmond, building Azure cloud products and Office systems.",
    culture: "Microsoft focuses on a growth mindset, cross-boundary collaboration, and active empathy in software engineering.",
    salaryRange: "₹26,000,000 - ₹50,000,000 LPA",
    targetRoles: ["SDE", "Cloud Developer", "Security Analyst", "Data Scientist"],
    requiredSkills: ["C#", "C++", "TypeScript", "React", "Azure", "Distributed Systems", "SQL Server", "Algorithms"],
    transferableMapping: {
      "C#": ["Java", "Kotlin"],
      "React": ["Angular", "Vue"],
      "Azure": ["AWS", "GCP"]
    },
    interviewProcess: ["Coding Round", "3x Technical Interviews (Algorithms & System Design)", "1x AA (As-Appropriate) Final Round"],
    cultureTraits: ["Growth Mindset", "Empathy", "Inclusivity", "Customer Focus", "Cooperation"]
  },
  {
    id: "comp-flipkart",
    name: "Flipkart",
    category: "Unicorn",
    about: "India's homegrown e-commerce pioneer, Flipkart builds giant inventory logistics, search recommender engines, and transaction platforms in Bangalore.",
    culture: "Values extreme ownership, bias for action, audacious thinking, and customer first.",
    salaryRange: "₹18,000,000 - ₹38,000,000 LPA",
    targetRoles: ["SDE I", "UI Engineer", "Data Analyst", "DevOps Engineer"],
    requiredSkills: ["Java", "Python", "React", "Node.js", "Redis", "Kafka", "MySQL", "System Design"],
    transferableMapping: {
      "Kafka": ["RabbitMQ", "ActiveMQ"],
      "Redis": ["Memcached"],
      "Node.js": ["Express", "Go"]
    },
    interviewProcess: ["Machine Coding Round (2 hours)", "1x Problem Solving/DSA Interview", "1x System Design Interview", "1x HM (Hiring Manager) Interview"],
    cultureTraits: ["Audacity", "Customer-First", "Bias for Action", "Integrity", "Empowerment"]
  },
  {
    id: "comp-razorpay",
    name: "Razorpay",
    category: "Unicorn",
    about: "A prominent fintech unicorn in Bangalore, Razorpay powers digital payments, payroll, and neo-banking pipelines for millions of Indian online merchants.",
    culture: "Promotes high transparency, rapid ownership, design-oriented problem solving, and zero bureaucracy.",
    salaryRange: "₹16,000,000 - ₹34,000,000 LPA",
    targetRoles: ["Software Engineer", "Frontend Developer", "Backend Engineer", "Data Engineer"],
    requiredSkills: ["Go", "PHP", "Node.js", "React", "AWS", "MySQL", "Redis", "System Design", "APIs"],
    transferableMapping: {
      "PHP": ["Laravel", "Python"],
      "Go": ["Java", "Rust"],
      "React": ["Vue", "Svelte"]
    },
    interviewProcess: ["Coding Assignment / Quiz", "1x Machine Coding Round", "2x Technical Round (Core, SQL, System Design)", "1x Culture Fit Round"],
    cultureTraits: ["Transparency", "Customer Obsession", "Speed of Delivery", "Team Harmony", "Open feedback"]
  },
  {
    id: "comp-cred",
    name: "CRED",
    category: "Unicorn",
    about: "A highly-stylized premium rewards and neo-banking platform in Bangalore, offering financial payment gateways to creditworthy individuals.",
    culture: "Fosters high-trust loops, elegant visual craftsmanship, obsession with aesthetic UI/UX, and extreme execution speed.",
    salaryRange: "₹20,000,000 - ₹40,000,000 LPA",
    targetRoles: ["Backend Engineer", "Frontend Engineer", "iOS Developer", "Android Developer"],
    requiredSkills: ["Go", "Kotlin", "Java", "React Native", "TypeScript", "Microservices", "Kafka", "PostgreSQL"],
    transferableMapping: {
      "React Native": ["Flutter", "Swift"],
      "Go": ["Node.js", "Java"],
      "Kotlin": ["Java", "Swift"]
    },
    interviewProcess: ["Take-home Technical Challenge", "1x Interactive Coding Round", "1x High/Low-Level System Design", "1x Founder/Exec Alignment Round"],
    cultureTraits: ["Trust Circles", "Visual Excellence", "High Agency", "Truth Seeking", "Elegance"]
  },
  {
    id: "comp-swiggy",
    name: "Swiggy",
    category: "Unicorn",
    about: "India's leading consumer tech logistics company, delivering food, instamart grocery items, and dine-out payments to millions of active daily users.",
    culture: "Values extreme speed, supply-chain logistics optimization, highly granular analytics, and customer focus.",
    salaryRange: "₹18,000,000 - ₹36,000,000 LPA",
    targetRoles: ["Software Engineer", "Data Scientist", "DevOps Engineer", "SDET"],
    requiredSkills: ["Go", "Java", "Python", "React", "Kafka", "Elasticsearch", "AWS", "Redis", "Kubernetes"],
    transferableMapping: {
      "Elasticsearch": ["Solr", "Opensearch"],
      "Kafka": ["RabbitMQ", "AWS SQS"]
    },
    interviewProcess: ["DSA Coding Test", "1x Machine Coding/Architecture Round", "2x Problem Solving & System Design Rounds", "1x Behavioral Alignments"],
    cultureTraits: ["Be Audacious", "Customer First", "Always Be Curious", "Speed & Scale", "Execution Excellence"]
  },
  {
    id: "comp-zomato",
    name: "Zomato",
    category: "Unicorn",
    about: "A public Indian food tech behemoth, running restaurant discovery lists, food delivery networks, and Hyperpure supply pipelines.",
    culture: "Aggressive speed, extreme focus on unit economics, creative product designs, and zero-bullsh*t alignment.",
    salaryRange: "₹18,000,000 - ₹38,000,000 LPA",
    targetRoles: ["SDE Backend", "SDE Frontend", "Mobile Engineer", "Product Analyst"],
    requiredSkills: ["PHP", "Go", "Node.js", "React", "MySQL", "Docker", "Kubernetes", "Redis", "Android", "iOS"],
    transferableMapping: {
      "PHP": ["Node.js", "Python"],
      "Go": ["Java", "C++"]
    },
    interviewProcess: ["Online Coding Test", "1x Practical Architecture Task", "2x Technical In-Depth (Concurrency, DB schema)", "1x Operations Fit"],
    cultureTraits: ["High Ownership", "Pragmatism", "Uncompromised Output", "Econ-First", "Constant Hustle"]
  },
  {
    id: "comp-zoho",
    name: "Zoho Corporation",
    category: "Enterprise",
    about: "Zoho builds a massive suite of cloud business SaaS applications in Chennai and Tenkasi, supporting over 100 million corporate users worldwide.",
    culture: "A unique bootstrapped marvel emphasizing rural engineering talent, self-reliance, massive long-term compound growth, and craft over marketing.",
    salaryRange: "₹800,000 - ₹2,000,000 LPA (Very high job security)",
    targetRoles: ["Software Developer", "Web Developer", "QA Analyst", "UI Designer"],
    requiredSkills: ["Java", "C", "C++", "JavaScript", "HTML", "CSS", "MySQL", "Database Management"],
    transferableMapping: {
      "JavaScript": ["TypeScript"],
      "Java": ["C#", "Python"]
    },
    interviewProcess: ["Aptitude Test", "1x Coding Round in C/Java (String & Array algorithms)", "2x Multi-day Live Coding/Application Building", "1x Personal HR Panel"],
    cultureTraits: ["Self-reliance", "Local Development", "No VC Pressure", "Technical Independence", "Quiet Excellence"]
  },
  {
    id: "comp-freshworks",
    name: "Freshworks",
    category: "Enterprise",
    about: "The first Indian SaaS startup to list on NASDAQ, Freshworks designs modern CRM, IT ticketing, and customer support desks in Chennai and Bangalore.",
    culture: "Nurtures customer happiness, high aesthetic user experience, and friendly corporate collaboration.",
    salaryRange: "₹12,000,000 - ₹28,000,000 LPA",
    targetRoles: ["Software Engineer", "Frontend Developer", "Product Manager", "SRE"],
    requiredSkills: ["Ruby on Rails", "Node.js", "React", "Ember.js", "AWS", "MySQL", "Redis", "System Design"],
    transferableMapping: {
      "Ruby on Rails": ["Django", "Spring Boot", "Laravel"],
      "React": ["Angular", "Vue"]
    },
    interviewProcess: ["DSA Online Round", "1x Technical Web App Dev Challenge", "2x In-depth Interviews", "1x HR Happy-Culture Check"],
    cultureTraits: ["Kudumba (Family)", "Customer Happiness", "Collaboration", "Crafted Elegance", "Invention"]
  },
  {
    id: "comp-browserstack",
    name: "BrowserStack",
    category: "Product Startup",
    about: "The global gold-standard in website and mobile app cloud testing platforms, powering automated browser matrix workflows for millions of devs.",
    culture: "Highly developer-focused, technical-first, data-driven, and optimized for extreme product quality.",
    salaryRange: "₹15,000,000 - ₹32,000,000 LPA",
    targetRoles: ["SDE I Backend", "Frontend SDE", "Systems Architect", "Automation Engineer"],
    requiredSkills: ["Ruby", "Go", "Node.js", "React", "Docker", "Kubernetes", "Linux Shell", "TCP/IP Networking"],
    transferableMapping: {
      "Ruby": ["Python", "Node.js"],
      "React": ["TypeScript", "Vanilla JS"]
    },
    interviewProcess: ["Codility DSA Assessment", "1x Systems Coding Round", "1x Advanced OOP & System Internals Interview", "1x Engineering Manager Alignment"],
    cultureTraits: ["Developer Obsession", "Frictionless Quality", "Data Transparency", "Deep Focus", "Continuous Integration"]
  },
  {
    id: "comp-groww",
    name: "Groww",
    category: "Unicorn",
    about: "A fast-growing fintech unicorn in Bangalore, enabling mutual fund investing, stock trading, and futures analysis for millions of active retail traders.",
    culture: "Fosters transparency, high logical consistency, fast microservices infrastructure, and simple user onboarding experiences.",
    salaryRange: "₹14,000,000 - ₹30,000,000 LPA",
    targetRoles: ["Software Engineer", "Frontend Engineer", "Data Engineer", "Securities SDE"],
    requiredSkills: ["Java", "Spring Boot", "React", "Python", "SQL", "Docker", "AWS", "Kafka"],
    transferableMapping: {
      "Java": ["Kotlin", "C#"],
      "Kafka": ["ActiveMQ", "RabbitMQ"]
    },
    interviewProcess: ["Aptitude & Coding Assessment", "1x Coding Round", "2x Technical Rounds (Spring Boot, DB indexing, API limits)", "1x Leadership Alignments"],
    cultureTraits: ["Transparency", "Simplicity", "Absolute integrity", "Hustle", "Team Synergy"]
  },
  {
    id: "comp-phonepe",
    name: "PhonePe",
    category: "Unicorn",
    about: "India's digital payments giant powering billions of monthly UPI payments and insurance marketplaces, managed in Pune and Bangalore.",
    culture: "Values massive transaction scale engineering, zero-downtime microservice structures, high security standards, and rigorous testing.",
    salaryRange: "₹22,000,000 - ₹44,000,000 LPA",
    targetRoles: ["SDE I Backend", "SDE I UI", "Site Reliability Architect", "Data Analyst"],
    requiredSkills: ["Java", "Go", "Cassandra", "Couchbase", "Kafka", "Docker", "React", "System Design", "Networking Security"],
    transferableMapping: {
      "Cassandra": ["HBase", "MongoDB"],
      "Go": ["C++", "Java"]
    },
    interviewProcess: ["Machine Coding / Architectural design round", "2x Core Engineering Interview", "1x Scale & System Architecture Interview", "1x HM Review"],
    cultureTraits: ["Scale Obsession", "Precision Engineering", "Zero Bullsh*t", "Inclusiveness", "Continuous Execution"]
  }
];

// Dynamically expand company array to top 50 Indian tech companies deterministically
const extraNames = [
  "TCS", "Infosys", "Wipro", "HCLTech", "Tech Mahindra", "LTIMindtree", "Cognizant", 
  "Airtel India", "Reliance Jio", "Paytm", "Ola Cabs", "Ola Electric", "Zepto", 
  "Blinkit", "Meesho", "InMobi", "Delhivery", "Nykaa", "PolicyBazaar", "ShareChat", 
  "Zerodha", "Pine Labs", "One97", "Sigma Computing India", "Mu Sigma", "BYJU's", 
  "Unacademy", "PhysicsWallah", "Upgrad", "Eruditus", "Lead School", "Classplus", 
  "Urban Company", "Rebel Foods", "Tata 1mg", "Pharmeasy", "Lenskart"
];

extraNames.forEach((name, index) => {
  const categories: ("MAANG" | "Unicorn" | "Product Startup" | "Enterprise" | "Consulting")[] = 
    ["Enterprise", "Consulting", "Unicorn", "Product Startup"];
  const category = categories[index % categories.length];
  
  const skillPool = [
    ["Java", "Spring Boot", "MySQL", "Algorithms", "System Design"],
    ["Python", "Django", "PostgreSQL", "React", "Docker"],
    ["TypeScript", "Node.js", "MongoDB", "Express", "React"],
    ["C++", "Algorithms", "Data Structures", "Linux", "System Design"],
    ["Go", "Kubernetes", "Docker", "gRPC", "PostgreSQL"],
    ["Kotlin", "Android", "Java", "REST APIs", "SQL"],
    ["Swift", "iOS", "Objective-C", "APIs", "Git"]
  ];
  const requiredSkills = skillPool[index % skillPool.length];
  
  const targetRolesPool = [
    ["SDE I", "Software Developer", "System Analyst"],
    ["Full-Stack Engineer", "Frontend Developer", "Backend Developer"],
    ["Mobile Engineer", "Android Developer", "iOS Developer"],
    ["Data Analyst", "Data Engineer", "ML Engineer"]
  ];
  const targetRoles = targetRolesPool[index % targetRolesPool.length];

  INDIAN_TECH_COMPANIES.push({
    id: `comp-gen-${index}`,
    name,
    category,
    about: `${name} is one of India's prominent tech organizations, leading digital transformations and software solutions at scale.`,
    culture: `Focused on continuous learning, high deliverables, solid customer relations, and structural code quality.`,
    salaryRange: category === "Unicorn" || category === "Product Startup"
      ? "₹12,000,000 - ₹28,000,000 LPA"
      : "₹500,000 - ₹1,800,000 LPA",
    targetRoles,
    requiredSkills,
    transferableMapping: {
      "Java": ["Kotlin", "C#"],
      "React": ["Angular", "Vue"],
      "Docker": ["Kubernetes", "AWS"]
    },
    interviewProcess: ["Aptitude Quiz", "1x Problem Solving Code Round", "1x Managerial Fit Interview"],
    cultureTraits: ["Commitment", "Ownership", "Team Collaboration", "Customer Satisfaction"]
  });
});

export interface MatchResult {
  company: string;
  category: string;
  match_breakdown: {
    exact_skill_match: number;
    transferable_skills: number;
    growth_potential: number;
    interview_readiness: number;
    cultural_fit: number;
  };
  overall_match: number;
  skill_gaps: {
    skill: string;
    current_level: number;
    required_level: number;
    weeks_to_learn: number;
    resources: { title: string; link: string }[];
  }[];
  success_probability: number;
  your_percentile: string;
  recommendation: string;
}

// Simulated Anonymized Student DB of 15 high-quality Indian college student profiles
// (IITs, NITs, BITS, and Top State colleges) used to compute the candidate's exact percentile.
export const ANONYMIZED_STUDENT_DB = [
  { id: "stud-1", college: "IIT Madras", skillsCount: 9, projects: 4, dsaLevel: 5, cgpa: 9.1 },
  { id: "stud-2", college: "IIT Delhi", skillsCount: 8, projects: 3, dsaLevel: 4, cgpa: 8.7 },
  { id: "stud-3", college: "BITS Pilani", skillsCount: 7, projects: 3, dsaLevel: 4, cgpa: 8.2 },
  { id: "stud-4", college: "NIT Trichy", skillsCount: 6, projects: 2, dsaLevel: 3, cgpa: 8.5 },
  { id: "stud-5", college: "IIT Bombay", skillsCount: 11, projects: 5, dsaLevel: 5, cgpa: 9.4 },
  { id: "stud-6", college: "COEP Pune", skillsCount: 7, projects: 2, dsaLevel: 3, cgpa: 7.9 },
  { id: "stud-7", college: "DTU Delhi", skillsCount: 8, projects: 3, dsaLevel: 4, cgpa: 8.1 },
  { id: "stud-8", college: "VIT Vellore", skillsCount: 6, projects: 2, dsaLevel: 2, cgpa: 8.8 },
  { id: "stud-9", college: "RVCE Bangalore", skillsCount: 7, projects: 3, dsaLevel: 3, cgpa: 8.4 },
  { id: "stud-10", college: "BITS Goa", skillsCount: 9, projects: 4, dsaLevel: 4, cgpa: 8.6 },
  { id: "stud-11", college: "IIIT Hyderabad", skillsCount: 12, projects: 6, dsaLevel: 5, cgpa: 9.5 },
  { id: "stud-12", college: "NIT Surathkal", skillsCount: 8, projects: 3, dsaLevel: 4, cgpa: 8.9 },
  { id: "stud-13", college: "PES Bangalore", skillsCount: 6, projects: 2, dsaLevel: 3, cgpa: 7.8 },
  { id: "stud-14", college: "NSUT Delhi", skillsCount: 8, projects: 3, dsaLevel: 3, cgpa: 8.3 },
  { id: "stud-15", college: "IIT Kharagpur", skillsCount: 10, projects: 4, dsaLevel: 5, cgpa: 9.0 }
];

export function runCompanyMatchingAlgorithm(
  candidateSkills: string[],
  candidateExperienceYrs: number,
  targetRoles: string[],
  company: IndianCompany
): MatchResult {
  const normalizedCandidateSkills = candidateSkills.map((s) => s.trim().toLowerCase());
  const requiredSkillsLower = company.requiredSkills.map((s) => s.toLowerCase());

  // 1. Calculate Exact Skill Match %
  let exactMatches = 0;
  requiredSkillsLower.forEach((req) => {
    if (normalizedCandidateSkills.some((cand) => cand.includes(req) || req.includes(cand))) {
      exactMatches++;
    }
  });
  const exactSkillMatch = Math.round((exactMatches / company.requiredSkills.length) * 100);

  // 2. Calculate Transferable Skills Match %
  let transferableMatches = 0;
  const missingRequired = company.requiredSkills.filter(
    (req) => !normalizedCandidateSkills.some((cand) => cand.includes(req.toLowerCase()) || req.toLowerCase().includes(cand))
  );

  missingRequired.forEach((req) => {
    const mapping = company.transferableMapping[req];
    if (mapping) {
      const hasAlternative = mapping.some((alt) =>
        normalizedCandidateSkills.some((cand) => cand.includes(alt.toLowerCase()) || alt.toLowerCase().includes(cand))
      );
      if (hasAlternative) {
        transferableMatches++;
      }
    }
  });
  const transferable_skills = Math.round(
    (transferableMatches / Math.max(1, missingRequired.length)) * 100
  );

  // 3. Growth Potential (based on overlap, experience, and scale)
  const growth_potential = Math.min(
    100,
    70 + (candidateExperienceYrs * 6) + (normalizedCandidateSkills.length * 2)
  );

  // 4. Interview Readiness (estimate from matching roles and skills density)
  let interview_readiness = Math.round(
    (exactSkillMatch * 0.7) + (candidateExperienceYrs * 10)
  );
  interview_readiness = Math.max(20, Math.min(98, interview_readiness));

  // 5. Cultural Fit
  // Checks common culture-fit alignments (e.g., startup experience matches startup categories)
  let cultural_fit = 65;
  if (company.category === "Product Startup" || company.category === "Unicorn") {
    if (normalizedCandidateSkills.includes("high agency") || normalizedCandidateSkills.includes("startup") || candidateExperienceYrs > 1) {
      cultural_fit += 20;
    }
  } else if (company.category === "MAANG") {
    if (normalizedCandidateSkills.includes("algorithms") || normalizedCandidateSkills.includes("system design") || candidateSkills.length > 5) {
      cultural_fit += 25;
    }
  }
  cultural_fit = Math.min(99, cultural_fit);

  // 6. Overall Match Score
  const overall_match = Math.round(
    (exactSkillMatch * 0.35) +
    (transferable_skills * 0.15) +
    (growth_potential * 0.15) +
    (interview_readiness * 0.2) +
    (cultural_fit * 0.15)
  );

  // 7. Success Probability
  let success_probability = Math.round(overall_match * 0.95 - (company.category === "MAANG" ? 10 : 5));
  success_probability = Math.max(25, Math.min(97, success_probability));

  // 8. Calculate percentile against anonymized database
  // Score comparison based on candidate skills and experience vs database average
  const candStrength = candidateSkills.length * 1.5 + candidateExperienceYrs * 4;
  let superiorCount = 0;
  ANONYMIZED_STUDENT_DB.forEach((stud) => {
    const studStrength = stud.skillsCount * 1.5 + (stud.dsaLevel * 3);
    if (candStrength >= studStrength) {
      superiorCount++;
    }
  });
  const percentileVal = Math.round((superiorCount / ANONYMIZED_STUDENT_DB.length) * 100);
  let your_percentile = "Top 50%";
  if (percentileVal >= 90) {
    your_percentile = "Top 5% (Elite)";
  } else if (percentileVal >= 75) {
    your_percentile = "Top 15%";
  } else if (percentileVal >= 60) {
    your_percentile = "Top 25%";
  } else if (percentileVal >= 40) {
    your_percentile = "Top 40%";
  }

  // 9. Generate Skill Gaps & dynamic roadmap resources
  const skill_gaps: MatchResult["skill_gaps"] = [];
  missingRequired.forEach((req, idx) => {
    if (idx < 3) { // limit gaps to top 3
      let resources = [
        { title: `LeetCode ${req} Problems List`, link: `https://leetcode.com/problemset/all/?search=${encodeURIComponent(req)}` },
        { title: `${req} Interactive Tutorial`, link: `https://github.com/developer-roadmap/roadmaps` }
      ];
      if (req.toLowerCase().includes("system design")) {
        resources = [
          { title: "The System Design Primer (GitHub)", link: "https://github.com/donnemartin/system-design-primer" },
          { title: "Grokking System Design Fundamentals", link: "https://www.designgurus.io/course/grokking-the-system-design-interview" }
        ];
      } else if (req.toLowerCase().includes("algorithms") || req.toLowerCase().includes("structures")) {
        resources = [
          { title: "NeetCode 150 Core DSA Patterns", link: "https://neetcode.io/practice" },
          { title: "MIT Introduction to Algorithms (YouTube)", link: "https://youtube.com/playlist?list=PLUl4u3cNGP61Oq3tWYp6V_F-5jb5L2iLk" }
        ];
      } else if (req.toLowerCase().includes("aws") || req.toLowerCase().includes("azure")) {
        resources = [
          { title: "FreeCodeCamp Cloud Practitioner Tutorial", link: "https://www.freecodecamp.org/news/aws-certified-cloud-practitioner-study-guide-course/" },
          { title: "Official Cloud Documentation", link: "https://aws.amazon.com/getting-started/" }
        ];
      }

      skill_gaps.push({
        skill: req,
        current_level: Math.max(1, Math.min(3, Math.floor(Math.random() * 3))),
        required_level: 4,
        weeks_to_learn: Math.round(3 + Math.random() * 5),
        resources
      });
    }
  });

  // 10. Overall Recommendation text
  let recommendation = "DEVELOP SKILLS FIRST - Moderate match";
  if (overall_match >= 85) {
    recommendation = "APPLY NOW - Extremely high match";
  } else if (overall_match >= 70) {
    recommendation = "APPLY NOW - High match";
  } else if (overall_match >= 55) {
    recommendation = "PREPARE & APPLY - Solid potential";
  }

  return {
    company: company.name,
    category: company.category,
    match_breakdown: {
      exact_skill_match: exactSkillMatch,
      transferable_skills,
      growth_potential,
      interview_readiness,
      cultural_fit
    },
    overall_match,
    skill_gaps,
    success_probability,
    your_percentile,
    recommendation
  };
}
