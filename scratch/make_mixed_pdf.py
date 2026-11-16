import os
import struct

def make_unreadable_scan_pdf(output_pdf_path):
    # Create a 200x200 1-bit or RGB blank/noise image
    width, height = 300, 300
    # Blank white image in raw RGB
    blank_data = b"\xFF" * (width * height * 3)

    catalog = b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
    pages = b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
    page = (
        f"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {width} {height}] "
        f"/Resources << /XObject << /Im1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n"
    ).encode('ascii')

    img_header = (
        f"4 0 obj\n<< /Type /XObject /Subtype /Image /Width {width} /Height {height} "
        f"/ColorSpace /DeviceRGB /BitsPerComponent 8 /Length {len(blank_data)} >>\nstream\n"
    ).encode('ascii')
    img_footer = b"\nendstream\nendobj\n"

    content_stream = f"q\n{width} 0 0 {height} 0 0 cm\n/Im1 Do\nQ\n".encode('ascii')
    contents = f"5 0 obj\n<< /Length {len(content_stream)} >>\nstream\n".encode('ascii') + content_stream + b"endstream\nendobj\n"

    header = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"
    body = b""
    offsets = []
    for obj in [catalog, pages, page]:
        offsets.append(len(header) + len(body))
        body += obj
    offsets.append(len(header) + len(body))
    body += img_header + blank_data + img_footer
    offsets.append(len(header) + len(body))
    body += contents

    xref_offset = len(header) + len(body)
    xref = f"xref\n0 6\n0000000000 65535 f \n"
    for o in offsets:
        xref += f"{o:010d} 00000 n \n"
    trailer = f"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n"

    with open(output_pdf_path, 'wb') as f:
        f.write(header + body + xref.encode('ascii') + trailer.encode('ascii'))
    print("Created unreadable_scan.pdf:", output_pdf_path)

def make_mixed_pdf(image_path, output_pdf_path):
    with open(image_path, 'rb') as f:
        jpg_data = f.read()

    width, height = 896, 1200
    
    # 2 Pages:
    # Page 1: Text
    # Page 2: Image
    catalog = b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
    pages = b"2 0 obj\n<< /Type /Pages /Kids [3 0 R 6 0 R] /Count 2 >>\nendobj\n"

    # Page 1 (Text)
    font = b"4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
    text_stream = (
        b"BT\n/F1 14 Tf\n50 750 Td\n(PRIYA SHARMA) Tj\n0 -25 Td\n"
        b"(Senior Full Stack Engineer) Tj\n0 -25 Td\n"
        b"(priya.sharma@example.com | +91 9876543210) Tj\n0 -25 Td\n"
        b"(TECHNICAL SKILLS: React, Node.js, TypeScript, PostgreSQL, Python, Docker) Tj\nET\n"
    )
    p1_contents = f"5 0 obj\n<< /Length {len(text_stream)} >>\nstream\n".encode('ascii') + text_stream + b"endstream\nendobj\n"
    p1 = b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n"

    # Page 2 (Image)
    p2 = (
        f"6 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {width} {height}] "
        f"/Resources << /XObject << /Im1 7 0 R >> >> /Contents 8 0 R >>\nendobj\n"
    ).encode('ascii')

    img_header = (
        f"7 0 obj\n<< /Type /XObject /Subtype /Image /Width {width} /Height {height} "
        f"/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length {len(jpg_data)} >>\nstream\n"
    ).encode('ascii')
    img_footer = b"\nendstream\nendobj\n"

    img_stream = f"q\n{width} 0 0 {height} 0 0 cm\n/Im1 Do\nQ\n".encode('ascii')
    p2_contents = f"8 0 obj\n<< /Length {len(img_stream)} >>\nstream\n".encode('ascii') + img_stream + b"endstream\nendobj\n"

    header = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"
    body = b""
    offsets = []
    
    # 1: Catalog, 2: Pages, 3: P1, 4: Font, 5: P1_contents, 6: P2, 7: Image, 8: P2_contents
    for obj in [catalog, pages, p1, font, p1_contents, p2]:
        offsets.append(len(header) + len(body))
        body += obj

    offsets.append(len(header) + len(body))
    body += img_header + jpg_data + img_footer

    offsets.append(len(header) + len(body))
    body += p2_contents

    xref_offset = len(header) + len(body)
    xref = f"xref\n0 9\n0000000000 65535 f \n"
    for o in offsets:
        xref += f"{o:010d} 00000 n \n"
    trailer = f"trailer\n<< /Size 9 /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n"

    with open(output_pdf_path, 'wb') as f:
        f.write(header + body + xref.encode('ascii') + trailer.encode('ascii'))
    print("Created mixed_resume.pdf:", output_pdf_path)

if __name__ == '__main__':
    fixtures_dir = os.path.join('scratch', 'upload_fixtures')
    os.makedirs(fixtures_dir, exist_ok=True)
    img = os.path.join('public', 'assets', 'resume_sheet.jpg')
    make_mixed_pdf(img, os.path.join(fixtures_dir, 'mixed_resume.pdf'))
    make_unreadable_scan_pdf(os.path.join(fixtures_dir, 'unreadable_scan.pdf'))
