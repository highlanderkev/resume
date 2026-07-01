#!/usr/bin/env node

/**
 * Resume Data Extraction Pipeline
 * Extracts data from old_resumes/ and other_resumes/ folders
 * Supports: PDF, TXT, JSON formats
 */

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

const FOLDERS = ['./old_resumes', './other_resumes'];
const OUTPUT_DIR = './extracted_data';

class ResumeExtractor {
  constructor() {
    this.extractedData = {
      pdf: [],
      txt: [],
      metadata: {
        extractedAt: new Date().toISOString(),
        totalFiles: 0,
        successfulExtractions: 0,
        failedExtractions: 0
      }
    };
  }

  /**
   * Extract text from PDF file
   */
  async extractPDF(filePath) {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      
      return {
        filename: path.basename(filePath),
        path: filePath,
        text: data.text,
        pages: data.numpages,
        version: data.version,
        info: data.info || {},
        metadata: {
          keywords: this.extractKeywords(data.text),
          hasEmail: this.extractEmails(data.text),
          hasPhoneNumber: this.extractPhoneNumbers(data.text),
          hasLinks: this.extractUrls(data.text)
        }
      };
    } catch (error) {
      console.error(`Failed to extract PDF: ${filePath}`, error.message);
      return null;
    }
  }

  /**
   * Extract text from TXT file
   */
  extractTXT(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      return {
        filename: path.basename(filePath),
        path: filePath,
        text: content,
        metadata: {
          keywords: this.extractKeywords(content),
          hasEmail: this.extractEmails(content),
          hasPhoneNumber: this.extractPhoneNumbers(content),
          hasLinks: this.extractUrls(content),
          lineCount: content.split('\n').length
        }
      };
    } catch (error) {
      console.error(`Failed to extract TXT: ${filePath}`, error.message);
      return null;
    }
  }

  /**
   * Extract email addresses from text
   */
  extractEmails(text) {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    return text.match(emailRegex) || [];
  }

  /**
   * Extract phone numbers from text
   */
  extractPhoneNumbers(text) {
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    return text.match(phoneRegex) || [];
  }

  /**
   * Extract URLs from text
   */
  extractUrls(text) {
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
    return text.match(urlRegex) || [];
  }

  /**
   * Extract keywords/skills from text
   */
  extractKeywords(text) {
    const skillKeywords = [
      'typescript', 'python', 'javascript', 'node.js', 'react', 'aws', 'docker', 'kubernetes',
      'sql', 'mongodb', 'postgresql', 'redis', 'graphql', 'rest', 'microservices', 'serverless',
      'git', 'ci/cd', 'devops', 'machine learning', 'ai', 'azure', 'gcp', 'jenkins',
      'terraform', 'cloudformation', 'agile', 'scrum', 'leadership', 'management'
    ];

    const found = new Set();
    const lowerText = text.toLowerCase();
    
    skillKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        found.add(keyword);
      }
    });

    return Array.from(found);
  }

  /**
   * Process all files in specified folders
   */
  async processFolder(folderPath) {
    if (!fs.existsSync(folderPath)) {
      console.warn(`Folder not found: ${folderPath}`);
      return;
    }

    const files = fs.readdirSync(folderPath);
    
    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const stat = fs.statSync(filePath);

      if (!stat.isFile()) continue;

      this.extractedData.metadata.totalFiles++;
      const ext = path.extname(file).toLowerCase();

      let result = null;

      if (ext === '.pdf') {
        result = await this.extractPDF(filePath);
        if (result) {
          this.extractedData.pdf.push(result);
          this.extractedData.metadata.successfulExtractions++;
          console.log(`✓ Extracted PDF: ${file}`);
        } else {
          this.extractedData.metadata.failedExtractions++;
        }
      } else if (ext === '.txt') {
        result = this.extractTXT(filePath);
        if (result) {
          this.extractedData.txt.push(result);
          this.extractedData.metadata.successfulExtractions++;
          console.log(`✓ Extracted TXT: ${file}`);
        } else {
          this.extractedData.metadata.failedExtractions++;
        }
      }
    }
  }

  /**
   * Save extracted data to JSON files
   */
  saveOutput() {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Save full extraction
    const fullPath = path.join(OUTPUT_DIR, 'extracted_resumes.json');
    fs.writeFileSync(fullPath, JSON.stringify(this.extractedData, null, 2));
    console.log(`\n✓ Full extraction saved to: ${fullPath}`);

    // Save PDF extractions
    const pdfPath = path.join(OUTPUT_DIR, 'pdf_extractions.json');
    fs.writeFileSync(pdfPath, JSON.stringify(this.extractedData.pdf, null, 2));
    console.log(`✓ PDF extractions saved to: ${pdfPath}`);

    // Save TXT extractions
    const txtPath = path.join(OUTPUT_DIR, 'txt_extractions.json');
    fs.writeFileSync(txtPath, JSON.stringify(this.extractedData.txt, null, 2));
    console.log(`✓ TXT extractions saved to: ${txtPath}`);

    // Save metadata summary
    const summaryPath = path.join(OUTPUT_DIR, 'extraction_summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(this.extractedData.metadata, null, 2));
    console.log(`✓ Extraction summary saved to: ${summaryPath}`);

    // Generate human-readable report
    this.generateReport();
  }

  /**
   * Generate a human-readable extraction report
   */
  generateReport() {
    const reportPath = path.join(OUTPUT_DIR, 'EXTRACTION_REPORT.md');
    const metadata = this.extractedData.metadata;

    let report = `# Resume Data Extraction Report\n\n`;
    report += `**Generated:** ${metadata.extractedAt}\n\n`;
    report += `## Summary\n`;
    report += `- **Total Files Processed:** ${metadata.totalFiles}\n`;
    report += `- **Successful Extractions:** ${metadata.successfulExtractions}\n`;
    report += `- **Failed Extractions:** ${metadata.failedExtractions}\n`;
    report += `- **Success Rate:** ${((metadata.successfulExtractions / metadata.totalFiles) * 100).toFixed(1)}%\n\n`;

    report += `## PDF Extractions (${this.extractedData.pdf.length})\n`;
    this.extractedData.pdf.forEach((pdf, i) => {
      report += `\n### ${i + 1}. ${pdf.filename}\n`;
      report += `- **Pages:** ${pdf.pages}\n`;
      report += `- **Emails Found:** ${pdf.metadata.hasEmail.length > 0 ? pdf.metadata.hasEmail.join(', ') : 'None'}\n`;
      report += `- **Phone Numbers:** ${pdf.metadata.hasPhoneNumber.length > 0 ? pdf.metadata.hasPhoneNumber.join(', ') : 'None'}\n`;
      report += `- **URLs:** ${pdf.metadata.hasLinks.length}\n`;
      report += `- **Keywords Detected:** ${pdf.metadata.keywords.join(', ')}\n`;
      report += `- **Text Preview:** ${pdf.text.substring(0, 150)}...\n`;
    });

    report += `\n## Text Extractions (${this.extractedData.txt.length})\n`;
    this.extractedData.txt.forEach((txt, i) => {
      report += `\n### ${i + 1}. ${txt.filename}\n`;
      report += `- **Lines:** ${txt.metadata.lineCount}\n`;
      report += `- **Emails Found:** ${txt.metadata.hasEmail.length > 0 ? txt.metadata.hasEmail.join(', ') : 'None'}\n`;
      report += `- **Phone Numbers:** ${txt.metadata.hasPhoneNumber.length > 0 ? txt.metadata.hasPhoneNumber.join(', ') : 'None'}\n`;
      report += `- **URLs:** ${txt.metadata.hasLinks.length}\n`;
      report += `- **Keywords Detected:** ${txt.metadata.keywords.join(', ')}\n`;
      report += `- **Text Preview:** ${txt.text.substring(0, 150)}...\n`;
    });

    fs.writeFileSync(reportPath, report);
    console.log(`✓ Report saved to: ${reportPath}`);
  }

  /**
   * Run the full extraction pipeline
   */
  async run() {
    console.log('🚀 Starting Resume Data Extraction Pipeline\n');

    for (const folder of FOLDERS) {
      console.log(`📁 Processing folder: ${folder}`);
      await this.processFolder(folder);
    }

    this.saveOutput();

    console.log('\n✅ Extraction pipeline completed!');
    console.log(`\nResults saved to: ${OUTPUT_DIR}/`);
  }
}

// Export for use as module
module.exports = ResumeExtractor;

// Run the extractor if called directly
if (require.main === module) {
  const extractor = new ResumeExtractor();
  extractor.run().catch(error => {
    console.error('Pipeline error:', error);
    process.exit(1);
  });
}
