import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

console.log('PDF.js version:', pdfjsLib.version);
console.log('PDF.js OPS:', Object.keys(pdfjsLib.OPS).filter(k => k.toLowerCase().includes('image')));
