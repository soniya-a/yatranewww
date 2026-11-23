async function testDiverseResumes() {
  const resumes = [
    {
      title: "Mechanical Engineer (Word/Text)",
      text: `RAJESH PATEL
Mechanical Design Engineer | Pune, India
rajesh.patel@example.com | +91 9123456789
SUMMARY:
Mechanical engineer with 3 years experience in CAD modeling, HVAC and FEA simulation.
AREAS OF EXPERTISE:
SolidWorks, AutoCAD, ANSYS, GD&T, Heat Transfer, HVAC Systems, CNC Machining, FMEA
EXPERIENCE:
Design Engineer | Tata Motors | 2022 - Present
- Conducted structural and thermal FEA on engine mounting brackets using ANSYS.
- Created manufacturing drawings and BOM with GD&T per ASME Y14.5.
EDUCATION:
B.E. Mechanical Engineering | College of Engineering Pune | 2018 - 2022`
    },
    {
      title: "Civil Site Engineer (Word/Text)",
      text: `SNEHA REDDY
Civil Site Engineer | Hyderabad, India
sneha.reddy@example.com | +91 9988776655
SUMMARY:
Civil engineer specializing in RCC design, structural analysis and site execution.
KEY COMPETENCIES:
STAAD.Pro, AutoCAD Civil 3D, ETABS, RCC Design, Site Engineering, Project Management, Quantity Surveying
EXPERIENCE:
Site Engineer | L&T Construction | 2021 - Present
- Supervised reinforced concrete casting and structural foundation execution.
- Managed contractor schedules and site safety compliance.
EDUCATION:
B.Tech Civil Engineering | JNTU Hyderabad | 2017 - 2021`
    },
    {
      title: "Finance & Accounts Analyst",
      text: `VIKRAM MALHOTRA
Financial Analyst | Mumbai, India
vikram.malhotra@example.com | +91 9876501234
SUMMARY:
Finance professional with expertise in financial modeling, valuation, and IFRS.
TECHNICAL PROFICIENCIES:
Financial Valuation, DCF, Balance Sheet Analysis, Auditing, Tally ERP, GAAP Accounting, GST Compliance
EXPERIENCE:
Associate Analyst | HDFC Bank | 2022 - Present
- Built discounted cash flow valuation models for corporate banking clients.
EDUCATION:
MBA Finance | NMIMS Mumbai | 2020 - 2022`
    }
  ];

  for (const r of resumes) {
    console.log(`\nTesting ${r.title}...`);
    const t0 = Date.now();
    const res = await fetch("http://127.0.0.1:3000/api/resume/parse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer guest_diverse_test"
      },
      body: JSON.stringify({ resumeText: r.text })
    });
    const data = await res.json();
    console.log(`Status ${res.status} in ${Date.now() - t0}ms:`, {
      candidate_name: data.candidate_name,
      headline: data.headline,
      skillsCount: data.skills?.length,
      sampleSkills: data.skills?.slice(0, 5),
      matchingRoles: data.matchingRoles?.slice(0, 3),
      topCompany: data.matchingCompanies?.[0]?.company,
      parser_source: data.parser_source
    });
  }
}

testDiverseResumes().catch(console.error);
