with open('src/pages/Interview.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''    // Save active reply keyed directly by exact canonical question ID
    const qId = activeQ?.question_id || `Q${String(currentQuestionIndex + 1).padStart(3, '0')}`;
    const updatedAnswers = { ...answers, [qId]: trimmedMessage };
    setAnswers(updatedAnswers);'''

replacement = '''    // Save active reply keyed directly by exact canonical question ID
    const qId = activeQ?.question_id || `Q${String(currentQuestionIndex + 1).padStart(3, '0')}`;
    const updatedAnswers = { ...answers, [qId]: trimmedMessage };
    setAnswers(updatedAnswers);
    // Immediately persist answer to local storage and server for instant crash resilience
    persistSessionProgress(qId, currentQuestionIndex + 1, updatedAnswers, false);'''

if target in content:
    content = content.replace(target, replacement, 1)
    with open('src/pages/Interview.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS: Immediate persistSessionProgress added")
else:
    print("WARN: target not found")
