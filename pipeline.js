#!/usr/bin/env node

/**
 * Resume Data Pipeline Orchestrator
 * Main entry point that coordinates all extraction and parsing stages
 *
 * CLI flags:
 *   --json         Output machine-readable JSON to stdout (no emoji/decoration)
 *   --output FILE  Write JSON output to FILE instead of stdout
 */

const fs = require('fs');
const path = require('path');
const ResumeExtractor = require('./extract-resumes.js');
const ResumeParser = require('./resume-parser.js');

class PipelineOrchestrator {
  constructor(options = {}) {
    this.outputDir = './extracted_data';
    this.jsonMode = options.jsonMode || false;
    this.outputFile = options.outputFile || null;
    this.logger = this.jsonMode
      ? {
          info: () => {},
          success: () => {},
          error: (msg) => process.stderr.write(`{"level":"error","message":${JSON.stringify(msg)}}\n`),
          step: () => {}
        }
      : {
          info: (msg) => console.log(`ℹ️  ${msg}`),
          success: (msg) => console.log(`✅ ${msg}`),
          error: (msg) => console.error(`❌ ${msg}`),
          step: (num, total, msg) => console.log(`\n[${num}/${total}] ${msg}`)
        };
  }

  /**
   * Run the complete pipeline
   * @returns {Promise<object>} analysis results
   */
  async run() {
    if (!this.jsonMode) {
      console.log(`\n${'='.repeat(60)}`);
      console.log('📊 RESUME DATA EXTRACTION PIPELINE');
      console.log(`${'='.repeat(60)}\n`);
    }

    try {
      // Step 1: Extract raw data from files
      this.logger.step(1, 3, 'Extracting raw data from resume files...');
      const extractor = new ResumeExtractor({ quiet: this.jsonMode });
      await extractor.run();
      const extractedData = extractor.extractedData;

      // Step 2: Parse extracted data
      this.logger.step(2, 3, 'Parsing extracted data into structured format...');
      const parser = new ResumeParser();
      const parsedResumes = parser.parseResumes(extractedData);
      parser.saveParsedResumes(parsedResumes, this.outputDir);
      this.logger.info(`Parsed ${parsedResumes.length} resumes`);

      // Step 3: Generate analysis and reports
      this.logger.step(3, 3, 'Generating analysis reports...');
      const analysis = this.generateAnalysis(extractedData, parsedResumes);

      if (!this.jsonMode) {
        console.log(`\n${'='.repeat(60)}`);
        console.log('📁 OUTPUT FILES GENERATED:');
        console.log(`${'='.repeat(60)}`);
        this.listOutputFiles();
        console.log(`\n✨ Pipeline completed successfully!`);
        console.log(`📂 All data saved to: ${path.resolve(this.outputDir)}\n`);
      } else {
        const output = JSON.stringify({ ok: true, analysis }, null, 2);
        if (this.outputFile) {
          fs.writeFileSync(this.outputFile, output);
        } else {
          process.stdout.write(output + '\n');
        }
      }

      return analysis;

    } catch (error) {
      this.logger.error(`Pipeline failed: ${error.message}`);
      if (!this.jsonMode) {
        console.error(error.stack);
      } else {
        const errOutput = JSON.stringify({ ok: false, error: error.message });
        if (this.outputFile) {
          fs.writeFileSync(this.outputFile, errOutput);
        } else {
          process.stderr.write(errOutput + '\n');
        }
      }
      if (require.main === module) process.exit(1);
      throw error;
    }
  }

  /**
   * Generate analysis reports
   */
  generateAnalysis(extractedData, parsedResumes) {
    const analysis = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalResumesFound: extractedData.metadata.totalFiles,
        successfulExtractions: extractedData.metadata.successfulExtractions,
        failureRate: `${(100 - (extractedData.metadata.successfulExtractions / extractedData.metadata.totalFiles) * 100).toFixed(1)}%`
      },
      fileBreakdown: {
        pdfs: extractedData.pdf.length,
        textFiles: extractedData.txt.length
      },
      skills: this.analyzeSkills(parsedResumes),
      workExperience: this.analyzeWorkExperience(parsedResumes),
      education: this.analyzeEducation(parsedResumes),
      allContacts: this.extractAllContacts(extractedData),
      allUrls: this.extractAllUrls(extractedData)
    };

    const analysisPath = path.join(this.outputDir, 'analysis.json');
    fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));
    this.logger.success(`Analysis saved to: ${analysisPath}`);

    // Generate markdown report
    this.generateMarkdownReport(analysis, parsedResumes);

    return analysis;
  }

  /**
   * Analyze skills across all resumes
   */
  analyzeSkills(parsedResumes) {
    const skillMap = {};
    
    parsedResumes.forEach(resume => {
      if (resume.skills) {
        resume.skills.forEach(skillGroup => {
          skillGroup.keywords?.forEach(keyword => {
            skillMap[keyword] = (skillMap[keyword] || 0) + 1;
          });
        });
      }
    });

    return Object.entries(skillMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([skill, count]) => ({ skill, count }));
  }

  /**
   * Analyze work experience
   */
  analyzeWorkExperience(parsedResumes) {
    const companies = new Set();
    const positions = new Set();

    parsedResumes.forEach(resume => {
      resume.work?.forEach(job => {
        if (job.name) companies.add(job.name);
        if (job.position) positions.add(job.position);
      });
    });

    return {
      uniqueCompanies: companies.size,
      uniquePositions: positions.size,
      companies: Array.from(companies).slice(0, 10),
      positions: Array.from(positions).slice(0, 10)
    };
  }

  /**
   * Analyze education
   */
  analyzeEducation(parsedResumes) {
    const degrees = [];
    const institutions = new Set();

    parsedResumes.forEach(resume => {
      resume.education?.forEach(edu => {
        if (edu.studyType) degrees.push(edu.studyType);
        if (edu.institution) institutions.add(edu.institution);
      });
    });

    return {
      degreeTypes: degrees,
      uniqueInstitutions: institutions.size,
      institutions: Array.from(institutions)
    };
  }

  /**
   * Extract all contact information
   */
  extractAllContacts(extractedData) {
    const contacts = [];

    extractedData.pdf.forEach(pdf => {
      if (pdf.metadata.hasEmail.length > 0 || pdf.metadata.hasPhoneNumber.length > 0) {
        contacts.push({
          source: pdf.filename,
          type: 'PDF',
          emails: pdf.metadata.hasEmail,
          phones: pdf.metadata.hasPhoneNumber
        });
      }
    });

    extractedData.txt.forEach(txt => {
      if (txt.metadata.hasEmail.length > 0 || txt.metadata.hasPhoneNumber.length > 0) {
        contacts.push({
          source: txt.filename,
          type: 'TEXT',
          emails: txt.metadata.hasEmail,
          phones: txt.metadata.hasPhoneNumber
        });
      }
    });

    return contacts;
  }

  /**
   * Extract all URLs found in resumes
   */
  extractAllUrls(extractedData) {
    const urls = new Set();

    extractedData.pdf.forEach(pdf => {
      pdf.metadata.hasLinks?.forEach(url => urls.add(url));
    });

    extractedData.txt.forEach(txt => {
      txt.metadata.hasLinks?.forEach(url => urls.add(url));
    });

    return Array.from(urls);
  }

  /**
   * Generate comprehensive markdown report
   */
  generateMarkdownReport(analysis, parsedResumes) {
    let report = `# Resume Data Extraction - Analysis Report\n\n`;
    report += `**Generated:** ${analysis.generatedAt}\n\n`;

    report += `## Executive Summary\n`;
    report += `- **Total Resumes Found:** ${analysis.summary.totalResumesFound}\n`;
    report += `- **Successfully Extracted:** ${analysis.summary.successfulExtractions}\n`;
    report += `- **Failure Rate:** ${analysis.summary.failureRate}\n\n`;

    report += `## File Breakdown\n`;
    report += `| Format | Count |\n`;
    report += `|--------|-------|\n`;
    report += `| PDFs | ${analysis.fileBreakdown.pdfs} |\n`;
    report += `| Text Files | ${analysis.fileBreakdown.textFiles} |\n\n`;

    report += `## Top Skills Detected\n`;
    report += `| Rank | Skill | Frequency |\n`;
    report += `|------|-------|----------|\n`;
    analysis.skills.forEach((skill, i) => {
      report += `| ${i + 1} | ${skill.skill} | ${skill.count} |\n`;
    });
    report += `\n`;

    report += `## Work Experience Summary\n`;
    report += `- **Unique Companies:** ${analysis.workExperience.uniqueCompanies}\n`;
    report += `- **Unique Positions:** ${analysis.workExperience.uniquePositions}\n`;
    report += `- **Sample Companies:** ${analysis.workExperience.companies.slice(0, 5).join(', ')}\n`;
    report += `- **Sample Positions:** ${analysis.workExperience.positions.slice(0, 5).join(', ')}\n\n`;

    report += `## Education Summary\n`;
    report += `- **Degree Types:** ${analysis.education.degreeTypes.join(', ')}\n`;
    report += `- **Unique Institutions:** ${analysis.education.uniqueInstitutions}\n\n`;

    report += `## Contact Information Found\n`;
    report += `- **Email Addresses:** ${analysis.allContacts.reduce((sum, c) => sum + c.emails.length, 0)}\n`;
    report += `- **Phone Numbers:** ${analysis.allContacts.reduce((sum, c) => sum + c.phones.length, 0)}\n`;
    report += `- **URLs:** ${analysis.allUrls.length}\n\n`;

    report += `## Parsed Resume Details\n`;
    report += `**Total Parsed:** ${parsedResumes.length}\n\n`;
    parsedResumes.forEach((resume, i) => {
      report += `### ${i + 1}. ${resume.source}\n`;
      if (resume.basics.name) report += `- **Name:** ${resume.basics.name}\n`;
      if (resume.basics.email) report += `- **Email:** ${resume.basics.email}\n`;
      if (resume.basics.location) report += `- **Location:** ${resume.basics.location}\n`;
      report += `- **Work Experience Entries:** ${resume.work?.length || 0}\n`;
      report += `- **Education Entries:** ${resume.education?.length || 0}\n`;
      report += `- **Skill Categories:** ${resume.skills?.length || 0}\n`;
      report += `- **Detected Sections:** ${resume.sections?.join(', ') || 'N/A'}\n`;
      report += `\n`;
    });

    const reportPath = path.join(this.outputDir, 'ANALYSIS_REPORT.md');
    fs.writeFileSync(reportPath, report);
    this.logger.success(`Markdown report saved to: ${reportPath}`);
  }

  /**
   * List all generated output files
   */
  listOutputFiles() {
    if (!fs.existsSync(this.outputDir)) return;

    const files = fs.readdirSync(this.outputDir);
    files.forEach(file => {
      const filePath = path.join(this.outputDir, file);
      const stat = fs.statSync(filePath);
      const size = (stat.size / 1024).toFixed(2);
      console.log(`  📄 ${file} (${size} KB)`);
    });
  }
}

// Export for use as module
module.exports = PipelineOrchestrator;

// Run the orchestrator if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const outputIdx = args.indexOf('--output');
  const outputFile = outputIdx !== -1 ? args[outputIdx + 1] : null;

  const orchestrator = new PipelineOrchestrator({ jsonMode, outputFile });
  orchestrator.run().catch(error => {
    if (jsonMode) {
      process.stderr.write(JSON.stringify({ ok: false, error: error.message }) + '\n');
    } else {
      console.error('Fatal error:', error);
    }
    process.exit(1);
  });
}
