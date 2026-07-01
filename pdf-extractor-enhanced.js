#!/usr/bin/env node

/**
 * Enhanced PDF Extractor using pdfjs-dist
 * This is an alternative PDF extraction script for better compatibility
 */

const fs = require('fs');
const path = require('path');
const PdfParse = require('pdfjs-dist/legacy/build/pdf');

async function extractPdfText(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const pdf = await PdfParse.getDocument({ data: dataBuffer }).promise;
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    return {
      text: fullText,
      pages: pdf.numPages,
      success: true
    };
  } catch (error) {
    console.error(`Error extracting PDF: ${error.message}`);
    return {
      text: '',
      pages: 0,
      success: false,
      error: error.message
    };
  }
}

// Test on a sample PDF
const testFile = './old_resumes/Profile.pdf';
if (fs.existsSync(testFile)) {
  extractPdfText(testFile).then(result => {
    console.log('Extraction result:', {
      success: result.success,
      pages: result.pages,
      textLength: result.text.length,
      preview: result.text.substring(0, 200)
    });
  });
} else {
  console.log('Test file not found');
}
