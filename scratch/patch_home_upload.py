path = 'src/pages/Home.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Guard handleFileClick against duplicate clicks while parsing
target1 = '''  const handleFileClick = () => {
    fileInputRef.current?.click();
  };'''
repl1 = '''  const handleFileClick = () => {
    if (isParsingResume) return;
    fileInputRef.current?.click();
  };'''
assert target1 in c, 'target1 not found'
c = c.replace(target1, repl1, 1)

# 2. Add reader.onerror in docx, pdf, and image blocks
target_docx = '''      const reader = new FileReader();
      reader.onload = async (event) => {'''

idx = c.find(target_docx)
assert idx != -1, 'target_docx not found'
repl_docx = '''      const reader = new FileReader();
      reader.onerror = () => {
        setIsParsingResume(false);
        setAiThinkingStep(0);
        setParseError("Could not read the selected DOCX file from disk.");
      };
      reader.onload = async (event) => {'''
c = c[:idx] + repl_docx + c[idx+len(target_docx):]

idx_pdf = c.find(target_docx, idx + len(repl_docx))
assert idx_pdf != -1, 'target_pdf not found'
repl_pdf = '''      const reader = new FileReader();
      reader.onerror = () => {
        setIsParsingResume(false);
        setAiThinkingStep(0);
        setParseError("Could not read the selected PDF file from disk.");
      };
      reader.onload = async (event) => {'''
c = c[:idx_pdf] + repl_pdf + c[idx_pdf+len(target_docx):]

idx_img = c.find(target_docx, idx_pdf + len(repl_pdf))
assert idx_img != -1, 'target_img not found'
repl_img = '''      const reader = new FileReader();
      reader.onerror = () => {
        setIsParsingResume(false);
        setAiThinkingStep(0);
        setParseError("Could not read the selected image file from disk.");
      };
      reader.onload = async (event) => {'''
c = c[:idx_img] + repl_img + c[idx_img+len(target_docx):]

# 3. Update accept attribute
target_accept = 'accept=".txt,.md,.pdf,.docx,.png,.jpg,.jpeg,.webp"'
repl_accept = 'accept=".pdf,.PDF,.docx,.DOCX,.txt,.TXT,.md,.MD,.png,.PNG,.jpg,.JPG,.jpeg,.JPEG,.webp,.WEBP,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/*"'
assert target_accept in c, 'target_accept not found'
c = c.replace(target_accept, repl_accept, 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print('Successfully patched Home.tsx')
