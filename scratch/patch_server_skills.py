path = 'server.ts'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Update line 548 regex in extractVerifiedSkillsFromText to allow skills header without trailing colon/space
target_reg = 'if (/^(core skills|technical skills|skills|key competencies|tools & technologies|competencies)[:\\s]/i.test(trimmed)) {'
repl_reg = 'if (/^(core skills|technical skills|skills|key competencies|tools & technologies|competencies)([:\\s]|$)/i.test(trimmed)) {'
assert target_reg in c, 'target_reg not found'
c = c.replace(target_reg, repl_reg, 1)

# 2. Add fallback to extractVerifiedSkillsFromText if authoritativeSkills is empty
target_auth = '''        if (typeof skillStr === 'string' && skillStr.trim().length > 0) {
          const cleaned = skillStr.trim();
          const lower = cleaned.toLowerCase();
          if (!combinedSkillsSet.has(lower)) {
            combinedSkillsSet.add(lower);
            authoritativeSkills.push(cleaned);
          }
        }
      }'''

repl_auth = '''        if (typeof skillStr === 'string' && skillStr.trim().length > 0) {
          const cleaned = skillStr.trim();
          const lower = cleaned.toLowerCase();
          if (!combinedSkillsSet.has(lower)) {
            combinedSkillsSet.add(lower);
            authoritativeSkills.push(cleaned);
          }
        }
      }

      // If model returned no skills, fill in from local verified skills parser
      if (authoritativeSkills.length === 0) {
        const fallbackSkills = extractVerifiedSkillsFromText(resumeText);
        for (const s of fallbackSkills) {
          if (!combinedSkillsSet.has(s.toLowerCase())) {
            combinedSkillsSet.add(s.toLowerCase());
            authoritativeSkills.push(s);
          }
        }
      }'''
assert target_auth in c, 'target_auth not found'
c = c.replace(target_auth, repl_auth, 1)

# 3. In adaptedData: ensure skills falls back to authoritativeSkills if normalizedSkills is empty
target_adapted = '''        rawSkills: authoritativeSkills,
        skills: normalizedResult.normalizedSkills,
        structuredSkills: validatedIntelligence.skills,'''

repl_adapted = '''        rawSkills: authoritativeSkills,
        skills: normalizedResult.normalizedSkills.length > 0 ? normalizedResult.normalizedSkills : authoritativeSkills,
        structuredSkills: (validatedIntelligence.skills && validatedIntelligence.skills.length > 0)
          ? validatedIntelligence.skills
          : authoritativeSkills.map((s: string) => ({ name: s, category: "Verified Skills", evidence: s, confidence: 0.95 })),'''
assert target_adapted in c, 'target_adapted not found'
c = c.replace(target_adapted, repl_adapted, 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print('Successfully patched server.ts')
