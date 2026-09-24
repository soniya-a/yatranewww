// Company and Job Role Registry Database
// Programmatically generated to house 200+ distinct real companies, startups, and requirements

export interface CompanyJob {
  id: string;
  company: string;
  role: string;
  category: "aiml" | "datascience" | "technical" | "mechanical" | "civil" | "architecture" | "accounting" | "banking" | "startup";
  isStartup: boolean;
  requirements: string[];
  description: string;
  matchScore: string;
  reason: string;
}

// 1. RAW DATA CATEGORIZED
const CATEGORIES_DATA = {
  aiml: {
    companies: [
      "OpenAI", "Anthropic", "Google DeepMind", "Meta AI", "Cohere", "Hugging Face", "Midjourney", 
      "Character.ai", "Mistral AI", "Adept", "Scale AI", "Jasper", "Copy.ai", "Runway", 
      "ElevenLabs", "Perplexity AI", "Shield AI", "Inflection AI", "Stability AI", "Synthesia", 
      "Soundraw", "Harvey AI", "Writer", "Glean", "Cerebras Systems", "Groq"
    ],
    roles: [
      "AI Research Intern", "Machine Learning Compiler Engineer", "Generative AI Developer", 
      "NLP System Specialist", "Computer Vision Intern", "LLM Fine-tuning Engineer", 
      "Reinforcement Learning Specialist", "AI Safety Associate"
    ],
    requirements: [
      "Python", "PyTorch OR TensorFlow", "Deep Learning Architectures", "Transformer Networks (Attention mechanism)",
      "CUDA / GPU Optimization", "HuggingFace Transformers", "Fine-tuning & LoRA weight tuning", "Vector Databases (Pinecone/Milvus)"
    ],
    descriptions: [
      "Join us to push the boundaries of general intelligence and develop production-grade models that empower global human systems.",
      "Help engineer scalable training hardware pipelines and deploy cutting edge transformer graphs to millions of users.",
      "Work on alignment research, context caching, and highly efficient embeddings mapping to optimize low-latency inferencing loops."
    ],
    reasons: [
      "Your resume highlights deep neural modeling concepts and solid PyTorch execution, matching our cognitive training infrastructure.",
      "Excellent Python fluency and familiarity with modern Transformer blocks align directly with our inference engineering team tasks."
    ]
  },
  datascience: {
    companies: [
      "Snowflake", "Databricks", "Palantir", "Alteryx", "SAS", "Tableau Software", "Teradata", 
      "Cloudera", "Splunk", "Domino Data Lab", "Anaconda", "Neo4j", "Couchbase", "MongoDB", 
      "Confluent", "Elastic", "Fivetran", "dbt Labs", "Hex Tech", "Mode Analytics", 
      "Sigma Computing", "KNIME", "RapidMiner", "Qlik", "ThoughtSpot", "Airtable"
    ],
    roles: [
      "Data Scientist Intern", "Quantitative Data Analyst", "Data Platform Platform Engineer", 
      "Analytics Engineer", "Business Intelligence Specialist", "ETL Pipeline Engineer", 
      "Statistical Simulation Engineer"
    ],
    requirements: [
      "Python / R Programming", "SQL Database Optimization (Window Functions)", "Pandas & NumPy APIs", "A/B Testing & Bootstrapping",
      "Tableau or PowerBI Dashboarding", "Apache Spark or Databricks Spark pipelines", "Snowflake querying & dbt flows", "Data Warehousing concepts"
    ],
    descriptions: [
      "Lead data-driven platform discovery and sculpt pipelines that analyze multi-terabyte warehouse signals daily.",
      "Deploy statistical models and optimize visual dashboards to unlock high-level business alignment metrics.",
      "Build real-time streaming architectures using Spark and Kafka to detect high-speed transaction anomalies."
    ],
    reasons: [
      "Excellent SQL mastery and dbt pipeline insights from prior work make you a perfect fit for our analytics infrastructure.",
      "Strong machine learning feature engineering capability matches our custom predictive warehouse models team requirements."
    ]
  },
  technical: {
    companies: [
      "Google", "Microsoft", "Amazon", "Netflix", "Apple", "Meta", "Uber", "Airbnb", "Stripe", 
      "Coinbase", "Salesforce", "Oracle", "Cisco Systems", "Adobe", "Intel", "NVIDIA", 
      "IBM", "GitHub", "GitLab", "Slack", "Atlassian", "Zoom Video", "Shopify", "Spotify", 
      "Linkedin", "Dropbox", "HubSpot", "Block (Square)", "Pinterest", "Snap Inc", "Cloudflare", "Figma"
    ],
    roles: [
      "Software Engineering Intern", "Systems Architect Associate", "Cloud Infrastructure Intern", 
      "Site Reliability Engineer (SRE)", "Frontend Platform Specialist", "Backend Engineering Associate",
      "Cybersecurity Audit Advisor", "Full Stack Systems Associate"
    ],
    requirements: [
      "TypeScript & React.js", "Java / Spring Boot", "System Design (Caching, CDN, Balancing)", "Data Structures & Algorithms Complexity",
      "SQL / NoSQL (MongoDB, Postgres)", "Docker & Kubernetes Containerization", "AWS / Azure Cloud Deployment", "REST & gRPC Protocols"
    ],
    descriptions: [
      "Architect microservices that handle trillions of daily API packets with sub-millisecond response guarantees.",
      "Build highly interactive responsive web designs, using real-time WebSockets to deliver frictionless user collaboration.",
      "Optimize core database indexes and shard storage components to maintain operational reliability during peak intervals."
    ],
    reasons: [
      "Stellar data structure knowledge and modern full-stack TypeScript background enable immediate contributions to our live services.",
      "Clear system design thinking, with focus on caching levels and asynchronous job queues, aligns cleanly with our scaling sprints."
    ]
  },
  mechanical: {
    companies: [
      "Tesla Motors", "SpaceX", "Boeing Aerospace", "Caterpillar In.", "General Electric", 
      "Ford Motor Company", "General Motors", "Toyota", "Honda Research", "BMW Group", 
      "Lockheed Martin", "Northrop Grumman", "Siemens Motion", "Cummins Engines", "John Deere", 
      "Honeywell Aerospace", "Pratt & Whitney", "Rolls-Royce", "Bosch Engineering", "ASML", 
      "Dyson Technology", "Kawasaki Heavy Industries", "Mitsubishi Heavy", "Tata Motors", 
      "Mahindra & Mahindra", "Ola Electric", "Ather Energy", "Volvo Group"
    ],
    roles: [
      "Mechanical Design Intern", "Automotive Systems Engineer", "Thermal Management Specialist", 
      "Fluid Dynamics Simulation Engineer", "Aerospace Design Associate", "Product Development Intern",
      "Robotics Hardware Architect", "FEA Structural Analyst"
    ],
    requirements: [
      "AutoCAD / SolidWorks Solid Modeling", "Finite Element Analysis (FEA / ANSYS)", "GD&T (Geometric Dimensioning & Tolerancing)", 
      "Thermodynamics & Heat Transfer", "Material Selection (Alloy composites)", "MATLAB & Simulink Model Design", "Machining & CNC Prototyping"
    ],
    descriptions: [
      "Model high-performance structural systems and battery packing chassis designed to endure extreme mechanical stress landscapes.",
      "Run complex thermal simulations and aerodynamic calculations to maximize propulsion efficiency of orbital launchers.",
      "Design robotic actuation joints and drive train configurations that increase manufacturing throughput on planetary vehicle lines."
    ],
    reasons: [
      "Proven CAD and FEA structural design skills from academic team projects align directly with our chassis thermal analysis team.",
      "Deep understanding of material mechanics and hydraulic assemblies enables rapid contribution to our heavy machinery test beds."
    ]
  },
  civil: {
    companies: [
      "Bechtel Corp", "Fluor Corporation", "AECOM", "Jacobs Engineering", "Turner Construction", 
      "Kiewit Corp", "Skanska", "HDR Inc", "Vinci", "Balfour Beatty", "WSP Global", 
      "Arcadis", "Stantec", "Mott MacDonald", "Arup Group", "Bouygues Construction", 
      "Larsen & Toubro", "Tata Consulting Engineers", "DLF Group", "Shapoorji Pallonji", 
      "GMR Group", "Sobha Developers", "Godrej Properties", "Jaypee Associates"
    ],
    roles: [
      "Structural Engineering Intern", "Civil Site Engineer Associate", "Geotechnical Systems Analyst", 
      "Hydraulic Infrastructure Analyst", "Urban Transportation Consultant", "Construction Management Intern",
      "Bridge & Tunnel Design Specialist"
    ],
    requirements: [
      "AutoCAD Civil 3D", "STAAD.Pro OR ETABS Structural Modeling", "Geotechnical Foundation Analysis (Soil mechanics)",
      "Reinforced Concrete Design (RCC)", "Steel Structure Integrity Calculations", "Surveying & GIS Site Inspections", "Project Cost Estimation (BOQ)"
    ],
    descriptions: [
      "Help supervise urban transit pathways, and run concrete stress analyses on multi-level structures to guarantee public safety standards.",
      "Coordinate with environmental boards to design deep deep drainage systems, managing stormwater and soil bearing vulnerabilities.",
      "Develop project schedules and Bill of Quantities (BOQ) sheets to coordinate logistics across massive structural blueprints."
    ],
    reasons: [
      "Strong ETABS foundations and RCC beam calculation knowledge map cleanly to our core urban high-rise design group.",
      "Detailed familiarity with Soil Mechanics and Geotechnical surveying parameters fits directly into our deep-tunnel foundation division."
    ]
  },
  architecture: {
    companies: [
      "Gensler", "Perkins & Will", "HOK Architects", "Skidmore Owings & Merrill (SOM)", 
      "CallisonRTKL", "Perkins Eastman", "Woods Bagot", "NBBJ", "CannonDesign", 
      "Kohn Pedersen Fox (KPF)", "Populous", "Foster + Partners", "Zaha Hadid Architects", 
      "BIG (Bjarke Ingels Group)", "Nikken Sekkei", "Aedas", "DP Architects", 
      "Hafeez Contractor Architects", "Sanjay Puri Architects", "Morphogenesis", 
      "L&T Realty Design", "SOMA Architecture", "K Raheja Corp Design"
    ],
    roles: [
      "Architectural Design Intern", "BIM Modeling Associate (Revit)", "Sustainable Architecture Planner", 
      "Urban Landscape Designer", "Interior Spatial Strategist", "Façade Systems Designer"
    ],
    requirements: [
      "Autodesk Revit / AutoCAD", "Rhinoceros 3D & Grasshopper Scripting", "V-Ray or Lumion Render Pipelines", "BIM Coordination & Visual Panels",
      "Sustainable Design (LEED concepts)", "Building Codes & Zoning Compliance", "Spatial Layout Concept Ideation"
    ],
    descriptions: [
      "Ideate cutting-edge commercial spaces, crafting detailed BIM models and photorealistic V-Ray renders of carbon-neutral structures.",
      "Draft complex parametric facades using Grasshopper, and integrate active structural framing elements into comprehensive blueprints.",
      "Re-engineer interior circulation workflows and execute spatial analyses to build ergonomic high-capacity corporate offices."
    ],
    reasons: [
      "Excellent Revit BIM proficiency and parametric Grasshopper skills match our micro-grid landscape ideation team perfectly.",
      "Outstanding spatial layout eye and V-Ray visualization portfolio align immediately with our active hospitality design pitch board."
    ]
  },
  accounting: {
    companies: [
      "Deloitte", "PricewaterhouseCoopers (PwC)", "Ernst & Young (EY)", "KPMG", "BDO", 
      "Grant Thornton", "RSM International", "Crowe Global", "Baker Tilly", "CohnReznick", 
      "CliftonLarsonAllen", "EisnerAmper", "Moss Adams", "Plante Moran", "CBIZ", "Marcum", 
      "Armanino", "Withum", "Deloitte USI", "PwC SDC", "EY GDS", "KPMG India"
    ],
    roles: [
      "Corporate Tax Associate", "Audit & Assurance Intern", "Forensic Accounting Analyst", 
      "Financial Reporting Intern", "Risk Advisory Consultant", "Treasury Oversight Associate"
    ],
    requirements: [
      "GAAP / IFRS accounting frameworks", "Advanced Excel (VLOOKUP, Pivot, Macros)", "Tally / SAP FI ERP Systems", "Corporate Tax Codes & Filing",
      "Financial Statement Analysis", "Internal Control Auditing Procedures", "Ledger Reconciliation & Valuation"
    ],
    descriptions: [
      "Evaluate corporate ledgers to ensure tax compliance, auditing internal asset paths across major Fortune 500 tech clients.",
      "Perform fraud detection models and balance sheet stress calculations to guarantee alignment with sovereign regulatory standards.",
      "Consolidate cross-border revenue ledgers and prepare executive reports highlighting cash-flow variance ratios."
    ],
    reasons: [
      "Advanced logical Excel mastery combined with high-grade GAAP/IFRS conceptual knowledge fits Deloitte Tax compliance guidelines.",
      "Detail-oriented ledger reconciliation experience and audit practice make you a stellar fit for our public assurance teams."
    ]
  },
  banking: {
    companies: [
      "Goldman Sachs", "JPMorgan Chase", "Morgan Stanley", "Citigroup", "Bank of America Merrill Lynch", 
      "Wells Fargo Securities", "Barclays Capital", "HSBC Banking", "Deutsche Bank", "UBS", 
      "BNP Paribas", "Credit Suisse (India)", "HDFC Bank", "ICICI Bank", "State Bank of India (SBI)", 
      "Axis Bank", "Kotak Mahindra Bank", "Standard Chartered India", "DBS Bank India", "Nomura Securities"
    ],
    roles: [
      "Investment Banking Analyst (Intern)", "Quantitative Risk Analyst", "Global Markets Analyst", 
      "Equity Research Intern", "Corporate Finance Associate", "Risk Management Intern",
      "Portfolio Management Analyst"
    ],
    requirements: [
      "Financial Modeling (Three-Statement, DCF, LBO)", "Python / SQL for Quant Analytics", "Capital Markets & Valuation Theories",
      "Excel Financial Modeling (Macros)", "Macroeconomics & Portfolio Theory", "Risk Management (VaR modeling)", "Corporate Mergers (M&A) dynamics"
    ],
    descriptions: [
      "Construct detailed Discounted Cash Flow (DCF) models and valuation pitches to brief enterprise boards during high-stake mergers.",
      "Evaluate credit exposure risk indexes and construct trading algorithms using statistical analysis on sovereign bond indexes.",
      "Author comprehensive equity research notes examining technical market movements and estimating competitor revenue valuations."
    ],
    reasons: [
      "Fabulous financial modeling skills (including three-statement DCF models) match our active investment banking advisory cohorts.",
      "Strong quantitative programming ability (Python/SQL) combined with financial theory aligns directly with credit risk desks."
    ]
  },
  startup: {
    companies: [
      "Razorpay", "CRED", "Swiggy", "Zepto", "PhysicsWallah", "PhonePe", "Groww", 
      "Nykaa", "Zerodha", "Meesho", "Cars24", "Delhivery", "Lenskart", "Spinny", 
      "Urban Company", "Rebel Foods", "Classplus", "InMobi", "ShareChat", "BrowserStack", 
      "Postman", "Unacademy", "BYJU's", "Shiprocket", "BharatPe", "Porter Log", "Pine Labs", 
      "Ather Energy", "Slice card", "Mobikwik", "Khatabook", "Turtlemint", "Darwinbox"
    ],
    roles: [
      "Full-stack Founding Engineer", "Growth Hack Product Intern", "Operations Optimization Specialist", 
      "Mobile App Dev Intern (Flutter)", "Growth Analytics Analyst", "Backend Rapid Prototyper"
    ],
    requirements: [
      "High Agency & Execution Speed", "TypeScript / React Native or Flutter", "Fast Execution & Iteration speed", "Node.js / Firebase / Serverless",
      "SQL Data Extraction & Analytics", "Product Metric Mastery (Retention, CAC)", "API Integrations (Stripe, Razorpay, Twilio)"
    ],
    descriptions: [
      "Build fast, deploy daily, and manage multiple cross-functional features as we scale from 1M to 10M active daily users.",
      "Own core product funnels, integrate multi-provider API gateways, and launch lightweight MVPs inside hyper-fast sprint timelines.",
      "Hack operational pipelines and track real-time fulfillment logs to supercharge unit economics across tier-1 city hubs."
    ],
    reasons: [
      "Your high-agency background and fast React/Firebase prototype history fit the high-velocity hacker culture of high-growth startups.",
      "Impressive quick learning capacity and immediate full-stack deployment capability are exactly what we need to ship experimental features."
    ]
  }
};

// 2. DYNAMIC REGISTRY BUILDER (220+ COMPANIES)
function buildRegistry(): CompanyJob[] {
  const result: CompanyJob[] = [];
  let uniqueIdCounter = 1;

  const categories = Object.keys(CATEGORIES_DATA) as Array<keyof typeof CATEGORIES_DATA>;

  categories.forEach((catKey) => {
    const data = CATEGORIES_DATA[catKey];
    const { companies, roles, requirements, descriptions, reasons } = data;

    // We want to pair each of the companies with a dynamic combination of roles, requirements, descriptions, reasons.
    // To ensure complete coverage and realistic listings:
    companies.forEach((compName, index) => {
      // Deterministically pair each parameter using modular arithmetic to avoid duplicates block rendering
      const roleSelected = roles[index % roles.length];
      const descSelected = descriptions[index % descriptions.length];
      const reasonSelected = reasons[index % reasons.length];

      // Select 3 or 4 dynamic requirements
      const reqsSelected: string[] = [];
      for (let r = 0; r < 4; r++) {
        const item = requirements[(index + r * 2) % requirements.length];
        if (!reqsSelected.includes(item)) {
          reqsSelected.push(item);
        }
      }

      // Add startup classification
      const isStartup = catKey === "startup" || index % 5 === 0;

      // Base dynamic match score
      // Math.abs(x) logic based on index or something pseudo-random to make it stable but varied
      const hash = compName.charCodeAt(0) + (roleSelected.charCodeAt(0) || 0) + index;
      const matchScoreVal = 40 + (hash % 55); 
      const matchScore = `${matchScoreVal}%`;

      result.push({
        id: `comp-job-${uniqueIdCounter++}`,
        company: compName,
        role: roleSelected,
        category: catKey as any,
        isStartup,
        requirements: reqsSelected,
        description: `Welcome to ${compName}. ${descSelected}`,
        matchScore,
        reason: reasonSelected
      });
    });
  });

  return result;
}

export const COMPANIES_REGISTRY: CompanyJob[] = buildRegistry();

// 3. INTELLIGENT MATCHING SEARCH UTILITY Based on resume keywords
export function matchResumeToRegistry(resumeText: string, searchCategory?: string): {
  score: number;
  matchedCategory: string;
  recommendedRoles: string[];
  companies: CompanyJob[];
} {
  const norm = (resumeText || "").toLowerCase();

  // Weighted scoring dictionary per domain
  const DOMAIN_KEYWORDS: Record<keyof typeof CATEGORIES_DATA, string[]> = {
    mechanical: [
      "mechanical engineer", "mechanical design", "autocad", "solidworks", "catia", "creo",
      "ansys", "fea", "finite element", "fem", "cfd", "computational fluid", "gd&t",
      "geometric dimensioning", "thermodynamics", "heat transfer", "hvac", "fluid mechanics",
      "hydraulics", "hydraulic", "pneumatic", "cnc", "machining", "welding", "piping",
      "turbine", "compressor", "boiler", "metrology", "fmea", "preventive maintenance",
      "vibration analysis", "stress analysis", "material science", "maintenance engineer",
      "manufacturing process", "product design", "automotive", "aerospace", "tribology"
    ],
    civil: [
      "civil engineer", "civil engineering", "structural engineer", "structural analysis",
      "autocad civil 3d", "civil 3d", "staad", "staad.pro", "etabs", "sap2000",
      "rcc design", "reinforced concrete", "concrete", "steel structure", "geotechnical",
      "soil mechanics", "foundation design", "surveying", "quantity surveying", "estimation",
      "construction management", "site engineer", "site management", "drainage", "highway",
      "bridge", "revit structure", "primavera"
    ],
    aiml: [
      "machine learning", "deep learning", "pytorch", "tensorflow", "neural network",
      "transformer", "large language model", "llm", "huggingface", "computer vision",
      "natural language processing", "nlp", "reinforcement learning", "cuda", "vector database",
      "fine-tuning", "lora", "ai research"
    ],
    datascience: [
      "data scientist", "data analyst", "data science", "pandas", "numpy", "tableau",
      "power bi", "powerbi", "apache spark", "spark", "databricks", "snowflake", "dbt",
      "data warehouse", "statistics", "statistical", "a/b testing", "etl"
    ],
    technical: [
      "software engineer", "software developer", "frontend", "backend", "fullstack",
      "full-stack", "react", "typescript", "javascript", "node", "express", "fastapi",
      "django", "flask", "spring boot", "java", "c++", "c#", "golang", "rust",
      "docker", "kubernetes", "aws", "azure", "gcp", "postgresql", "postgres",
      "mongodb", "redis", "graphql", "rest api", "microservices"
    ],
    architecture: [
      "architectural", "architecture", "revit", "bim", "rhino", "rhinoceros",
      "grasshopper", "v-ray", "vray", "lumion", "sketchup", "archicad", "leed",
      "sustainable design", "urban design", "facade"
    ],
    accounting: [
      "accounting", "accountant", "auditing", "gaap", "ifrs", "tally", "sap fi",
      "ledger", "balance sheet", "taxation", "tax", "gst", "accounts payable", "accounts receivable"
    ],
    banking: [
      "investment banking", "equity research", "dcf", "valuation", "lbo", "derivatives",
      "portfolio management", "risk management", "capital markets", "mergers & acquisitions", "m&a"
    ],
    startup: [
      "startup", "fast-paced", "flutter", "firebase", "mvp", "growth hacker"
    ]
  };

  // Calculate scores based on keyword occurrences
  const scores: Record<string, number> = {
    mechanical: 0,
    civil: 0,
    aiml: 0,
    datascience: 0,
    technical: 0,
    architecture: 0,
    accounting: 0,
    banking: 0,
    startup: 0
  };

  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    for (const kw of keywords) {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|[^a-zA-Z0-9_])${escaped}([^a-zA-Z0-9_]|$)`, 'i');
      if (regex.test(norm)) {
        // Multi-word phrases and role titles carry higher specificity weight
        const weight = kw.includes(" ") ? 8 : 4;
        scores[domain] += weight;
      }
    }
  }

  // Explicit title boosts
  if (/\bmechanical (design )?engineer\b/i.test(norm)) scores.mechanical += 30;
  if (/\b(civil|structural) engineer\b/i.test(norm)) scores.civil += 30;
  if (/\b(machine learning|ml) engineer\b/i.test(norm) || /\bai research\b/i.test(norm)) scores.aiml += 30;
  if (/\bdata (scientist|analyst)\b/i.test(norm)) scores.datascience += 30;
  if (/\bsoftware (engineer|developer)\b/i.test(norm) || /\bfull-?stack\b/i.test(norm)) scores.technical += 30;
  if (norm.includes("architect")) scores.architecture += 20;

  // Determine top category safely — default to "technical" (general software/engineering), NOT "aiml"
  let topCategory: keyof typeof CATEGORIES_DATA = "technical";
  if (searchCategory && DOMAIN_KEYWORDS[searchCategory as keyof typeof CATEGORIES_DATA]) {
    topCategory = searchCategory as any;
  } else {
    let highestScore = 0;
    for (const [cat, sc] of Object.entries(scores)) {
      if (sc > highestScore) {
        highestScore = sc;
        topCategory = cat as any;
      }
    }
    // If no keywords matched at all, check for general domain words
    if (highestScore === 0) {
      if (norm.includes("mechanic") || norm.includes("cad") || norm.includes("machine")) {
        topCategory = "mechanical";
      } else if (norm.includes("civil") || norm.includes("construct") || norm.includes("structure")) {
        topCategory = "civil";
      } else {
        topCategory = "technical";
      }
    }
  }

  // Dynamic company matching & scoring
  const categoryCompanies = COMPANIES_REGISTRY.filter((comp) => comp.category === topCategory);
  const scoredCompanies = categoryCompanies.map((comp) => {
    // Count how many requirement words match the resume text
    const matchedReqs = comp.requirements.filter((req) => {
      const words = req.toLowerCase().split(/[\s/()&,]+/).filter((w) => w.length > 2);
      return words.some((w) => norm.includes(w));
    });

    const roleWords = comp.role.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const roleMatched = roleWords.some((w) => norm.includes(w));

    // Dynamic match score between 70% and 96%
    const matchPoints = matchedReqs.length * 12 + (roleMatched ? 15 : 0);
    const baseScore = Math.min(96, Math.max(70, 68 + matchPoints));

    // Dynamic reason citing the candidate's actual matched skills
    let dynamicReason = comp.reason;
    if (matchedReqs.length > 0) {
      dynamicReason = `Demonstrated competencies in ${matchedReqs.slice(0, 2).join(" & ")} align directly with our ${comp.role} opening.`;
    }

    return {
      ...comp,
      matchScore: `${baseScore}%`,
      reason: dynamicReason,
      _sortScore: baseScore
    };
  });

  // Sort dynamically by match score
  scoredCompanies.sort((a, b) => b._sortScore - a._sortScore);

  // Filter out internal sort score property
  const finalCompanies: CompanyJob[] = scoredCompanies.map(({ _sortScore, ...rest }) => rest);

  const roles = CATEGORIES_DATA[topCategory].roles;

  return {
    score: Math.min(95, 65 + (scores[topCategory] * 2)),
    matchedCategory: topCategory,
    recommendedRoles: roles,
    companies: finalCompanies
  };
}
