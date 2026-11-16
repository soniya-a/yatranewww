"""Generates real (not mocked) resume fixtures: a text PDF, a DOCX and an invalid fake .pdf."""
import os
import zipfile

OUT = os.path.join(os.path.dirname(__file__), "upload_fixtures")
os.makedirs(OUT, exist_ok=True)

LINES = [
    "Aarav Mehta",
    "aarav.mehta@example.com | +91 98765 43210 | Pune, India",
    "SUMMARY",
    "Final year B.Tech Computer Science student with hands-on React, Node.js and Python experience.",
    "SKILLS",
    "JavaScript, TypeScript, React, Node.js, Express, Python, SQL, PostgreSQL, Git, Docker",
    "EXPERIENCE",
    "Software Engineering Intern, Acme Labs (Jun 2025 - Aug 2025)",
    "Built REST APIs with Node.js and Express serving 5000 daily users.",
    "EDUCATION",
    "B.Tech Computer Science, Pune Institute of Technology, 2022 - 2026, CGPA 8.2",
    "PROJECTS",
    "Placement Tracker - React and Node.js web app to track campus placements.",
]


def esc(s: str) -> str:
    return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def make_pdf(path: str) -> None:
    content = ["BT", "/F1 11 Tf", "14 TL", "50 780 Td"]
    for line in LINES:
        content.append(f"({esc(line)}) Tj T*")
    content.append("ET")
    stream = "\n".join(content).encode("latin-1")
    objs = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R "
        b"/Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for i, body in enumerate(objs, start=1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n".encode() + body + b"\nendobj\n"
    xref = len(out)
    out += f"xref\n0 {len(objs) + 1}\n".encode()
    out += b"0000000000 65535 f \n"
    for off in offsets:
        out += f"{off:010d} 00000 n \n".encode()
    out += f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
    with open(path, "wb") as f:
        f.write(out)


def make_docx(path: str) -> None:
    paras = "".join(
        f'<w:p><w:r><w:t xml:space="preserve">{l}</w:t></w:r></w:p>'.replace("&", "&amp;")
        for l in LINES
    )
    document = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        f"<w:body>{paras}</w:body></w:document>"
    )
    content_types = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/word/document.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
        "</Types>"
    )
    rels = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
        'Target="word/document.xml"/></Relationships>'
    )
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", content_types)
        z.writestr("_rels/.rels", rels)
        z.writestr("word/document.xml", document)


make_pdf(os.path.join(OUT, "valid_resume.pdf"))
make_docx(os.path.join(OUT, "valid_resume.docx"))
with open(os.path.join(OUT, "fake_resume.pdf"), "w") as f:
    f.write("this is not a pdf, just text renamed to .pdf")
with open(os.path.join(OUT, "bad_format.exe"), "wb") as f:
    f.write(b"MZ\x90\x00" + b"\x00" * 64)
print("fixtures written to", OUT)
