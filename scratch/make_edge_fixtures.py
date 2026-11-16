import os

fixtures_dir = os.path.join(os.getcwd(), 'scratch', 'upload_fixtures')
os.makedirs(fixtures_dir, exist_ok=True)

# 1. Empty PDF (valid PDF syntax, zero text objects)
empty_pdf = b"""%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj
4 0 obj << /Length 0 >>
stream
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000214 00000 n 
trailer << /Size 5 /Root 1 0 R >>
startxref
263
%%EOF
"""
with open(os.path.join(fixtures_dir, 'empty_resume.pdf'), 'wb') as f:
    f.write(empty_pdf)

# 2. Oversized dummy (>10MB)
# 10.5 MB of dummy PDF bytes
with open(os.path.join(fixtures_dir, 'oversized_resume.pdf'), 'wb') as f:
    f.write(b"%PDF-1.4\n%oversized-test\n" + b"0" * (10500000) + b"\n%%EOF\n")

print("Created empty_resume.pdf and oversized_resume.pdf in", fixtures_dir)
