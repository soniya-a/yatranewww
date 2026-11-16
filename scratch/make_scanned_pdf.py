import os
import struct

def make_scanned_pdf(image_path, output_pdf_path):
    with open(image_path, 'rb') as f:
        jpg_data = f.read()

    # Get JPEG dimensions from SOF marker
    # SOF markers: 0xFF, 0xC0 .. 0xC3
    idx = 2
    width, height = 800, 1000
    while idx < len(jpg_data) - 9:
        if jpg_data[idx] == 0xFF and jpg_data[idx+1] in [0xC0, 0xC1, 0xC2]:
            h, w = struct.unpack('>HH', jpg_data[idx+5:idx+9])
            height, width = h, w
            break
        elif jpg_data[idx] == 0xFF:
            length = struct.unpack('>H', jpg_data[idx+2:idx+4])[0]
            idx += 2 + length
        else:
            idx += 1

    print(f"JPEG dimensions: {width}x{height}, size: {len(jpg_data)} bytes")

    # Construct standard valid PDF 1.4 with embedded DCTDecode Image
    # Object 1: Catalog
    # Object 2: Pages
    # Object 3: Page 1
    # Object 4: Image XObject
    # Object 5: Content stream (drawing image on page)

    catalog = b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
    pages = b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
    
    page = (
        f"3 0 obj\n"
        f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {width} {height}] "
        f"/Resources << /XObject << /Im1 4 0 R >> >> "
        f"/Contents 5 0 R >>\nendobj\n"
    ).encode('ascii')

    img_header = (
        f"4 0 obj\n"
        f"<< /Type /XObject /Subtype /Image /Width {width} /Height {height} "
        f"/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length {len(jpg_data)} >>\n"
        f"stream\n"
    ).encode('ascii')
    img_footer = b"\nendstream\nendobj\n"

    # Draw image scaled to page
    content_stream = f"q\n{width} 0 0 {height} 0 0 cm\n/Im1 Do\nQ\n".encode('ascii')
    contents = (
        f"5 0 obj\n<< /Length {len(content_stream)} >>\nstream\n"
    ).encode('ascii') + content_stream + b"endstream\nendobj\n"

    # Build file
    header = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"
    
    offsets = []
    body = b""
    
    for obj_data in [catalog, pages, page]:
        offsets.append(len(header) + len(body))
        body += obj_data

    # Image obj 4
    offsets.append(len(header) + len(body))
    body += img_header + jpg_data + img_footer

    # Contents obj 5
    offsets.append(len(header) + len(body))
    body += contents

    xref_offset = len(header) + len(body)
    xref = f"xref\n0 6\n0000000000 65535 f \n"
    for o in offsets:
        xref += f"{o:010d} 00000 n \n"
    
    trailer = f"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n"

    pdf_bytes = header + body + xref.encode('ascii') + trailer.encode('ascii')

    with open(output_pdf_path, 'wb') as f:
        f.write(pdf_bytes)

    print(f"Created scanned PDF: {output_pdf_path} ({len(pdf_bytes)} bytes)")

if __name__ == '__main__':
    src = os.path.join('public', 'assets', 'resume_sheet.jpg')
    dst = os.path.join('scratch', 'upload_fixtures', 'scanned_resume.pdf')
    make_scanned_pdf(src, dst)
