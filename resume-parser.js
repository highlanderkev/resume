#!/usr/bin/env node

/**
 * Advanced Resume Parser
 * Converts extracted text into structured JSON Resume format
 */

const fs = require('fs');
const path = require('path');

class ResumeParser {
  constructor() {
    this.parsedResumes = [];
  }

  /**
   * Parse raw text into structured resume sections
   */
  parseText(filename, text) {
    const resume = {
      source: filename,
      basics: this.parseBasics(text),
      work: this.parseWorkExperience(text),
      education: this.parseEducation(text),
      skills: this.parseSkills(text),
      projects: this.parseProjects(text),
      certifications: this.parseCertifications(text),
      sections: this.identifySections(text)
    };

    return resume;
  }

  /**
   * Extract basic information (name, email, phone, location)
   */
  parseBasics(text) {
    const basics = {
      name: this.extractName(text),
      email: this.extractEmail(text),
      phone: this.extractPhone(text),
      location: this.extractLocation(text),
      summary: this.extractSummary(text)
    };

    return Object.fromEntries(Object.entries(basics).filter(([_, v]) => v));
  }

  /**
   * Extract name (usually appears at top or with "Kevin Westropp" pattern)
   */
  extractName(text) {
    const lines = text.split('\n').slice(0, 10);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 0 && trimmed.length < 100 && !trimmed.includes('@')) {
        return trimmed;
      }
    }
    return null;
  }

  /**
   * Extract email address
   */
  extractEmail(text) {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const match = text.match(emailRegex);
    return match ? match[0] : null;
  }

  /**
   * Extract phone number
   */
  extractPhone(text) {
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/;
    const match = text.match(phoneRegex);
    return match ? match[0] : null;
  }

  /**
   * Extract location
   */
  extractLocation(text) {
    const locationKeywords = ['Denver', 'Colorado', 'Boulder', 'Fort Collins', 'Minneapolis', 'New York', 'San Francisco', 'Austin', 'Seattle', 'Chicago', 'Los Angeles'];
    for (const keyword of locationKeywords) {
      if (text.includes(keyword)) {
        return keyword;
      }
    }
    return null;
  }

  /**
   * Extract professional summary/objective
   */
  extractSummary(text) {
    const summaryKeywords = ['objective', 'summary', 'professional summary', 'about', 'introduction'];
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (summaryKeywords.some(keyword => line.includes(keyword))) {
        const nextLine = lines[i + 1];
        if (nextLine) {
          return nextLine.trim().substring(0, 300);
        }
      }
    }
    return null;
  }

  /**
   * Parse work experience section
   */
  parseWorkExperience(text) {
    const jobs = [];
    const workSectionRegex = /(?:experience|employment|work history|professional experience)[\s\S]*?(?=(?:education|skills|certification|projects|$))/i;
    const workSection = text.match(workSectionRegex);

    if (!workSection) return jobs;

    // Pattern for job entries: Company/Title Year
    const jobPattern = /([A-Z][A-Za-z\s&.,'-]*)\s*(?:\||,|-|–|—)?\s*(?:([A-Z][A-Za-z\s]*))?\s*(?:\()?(\d{4}|\w+\s*-\s*(?:Present|\d{4}))?/g;
    let match;

    while ((match = jobPattern.exec(workSection[0])) !== null) {
      const [_, company, title, dates] = match;
      if (company && company.trim().length > 2) {
        jobs.push({
          name: company.trim(),
          position: title ? title.trim() : 'Position',
          duration: dates ? dates.trim() : 'Duration',
          description: ''
        });
      }
    }

    return jobs;
  }

  /**
   * Parse education section
   */
  parseEducation(text) {
    const education = [];
    const eduSectionRegex = /(?:education|qualifications)[\s\S]*?(?=(?:experience|skills|certification|projects|$))/i;
    const eduSection = text.match(eduSectionRegex);

    if (!eduSection) return education;

    // Pattern for education: Degree, School, Year
    const degreePattern = /(Bachelor|Master|Ph\.?D|Associate|Certificate|Diploma)[^\n]*/gi;
    let match;

    while ((match = degreePattern.exec(eduSection[0])) !== null) {
      education.push({
        studyType: match[0].split(/[,;]/)[0].trim(),
        institution: 'University',
        area: 'Field of Study',
        startDate: '',
        endDate: ''
      });
    }

    return education;
  }

  /**
   * Parse skills section
   */
  parseSkills(text) {
    const skills = [];
    const skillKeywords = {
      'Languages': ['JavaScript', 'TypeScript', 'Python', 'Go', 'Rust', 'Java', 'C#', 'PHP', 'Ruby', 'Kotlin'],
      'Frontend': ['React', 'Vue', 'Angular', 'Next.js', 'Svelte', 'HTML', 'CSS', 'Tailwind'],
      'Backend': ['Node.js', 'Express', 'Django', 'FastAPI', 'Spring', 'ASP.NET', 'Ruby on Rails'],
      'Databases': ['PostgreSQL', 'MongoDB', 'Redis', 'MySQL', 'DynamoDB', 'Elasticsearch'],
      'Cloud': ['AWS', 'Azure', 'Google Cloud', 'Heroku', 'DigitalOcean'],
      'DevOps': ['Docker', 'Kubernetes', 'CI/CD', 'Terraform', 'Jenkins', 'GitLab CI'],
      'Other': ['Git', 'GraphQL', 'REST', 'Microservices', 'Serverless', 'Machine Learning']
    };

    const lowerText = text.toLowerCase();

    for (const [category, keywords] of Object.entries(skillKeywords)) {
      const found = keywords.filter(keyword => lowerText.includes(keyword.toLowerCase()));
      if (found.length > 0) {
        skills.push({
          name: category,
          level: 'Expert',
          keywords: found
        });
      }
    }

    return skills;
  }

  /**
   * Parse projects section
   */
  parseProjects(text) {
    const projects = [];
    const projectSectionRegex = /(?:projects|portfolio)[\s\S]*?(?=(?:skills|certification|experience|education|$))/i;
    const projectSection = text.match(projectSectionRegex);

    if (!projectSection) return projects;

    const projectPattern = /([A-Z][A-Za-z0-9\s&-]*)\s*[-–—|:]\s*([^\n]+)/g;
    let match;

    while ((match = projectPattern.exec(projectSection[0])) !== null) {
      projects.push({
        name: match[1].trim(),
        description: match[2].trim(),
        highlights: []
      });
    }

    return projects;
  }

  /**
   * Parse certifications section
   */
  parseCertifications(text) {
    const certs = [];
    const certSectionRegex = /(?:certification|credentials|certificate)s?[\s\S]*?(?=(?:projects|skills|$))/i;
    const certSection = text.match(certSectionRegex);

    if (!certSection) return certs;

    const certPattern = /([A-Z][A-Za-z0-9\s&-]*)\s*[-–—|:]\s*([A-Za-z\s&]*)/g;
    let match;

    while ((match = certPattern.exec(certSection[0])) !== null) {
      certs.push({
        name: match[1].trim(),
        issuer: match[2].trim(),
        date: ''
      });
    }

    return certs;
  }

  /**
   * Identify major sections in the resume
   */
  identifySections(text) {
    const sections = [];
    const sectionKeywords = [
      'summary', 'objective', 'experience', 'employment', 'work history',
      'education', 'qualifications', 'skills', 'competencies', 'projects',
      'portfolio', 'achievements', 'awards', 'certifications', 'credentials',
      'languages', 'publications', 'volunteer', 'references'
    ];

    const lowerText = text.toLowerCase();
    for (const keyword of sectionKeywords) {
      if (lowerText.includes(keyword)) {
        sections.push(keyword);
      }
    }

    return sections;
  }

  /**
   * Parse multiple resume files
   */
  parseResumes(extractedData) {
    const parsed = [];

    // Parse PDFs
    if (extractedData.pdf) {
      extractedData.pdf.forEach(pdf => {
        parsed.push(this.parseText(pdf.filename, pdf.text));
      });
    }

    // Parse TXTs
    if (extractedData.txt) {
      extractedData.txt.forEach(txt => {
        parsed.push(this.parseText(txt.filename, txt.text));
      });
    }

    return parsed;
  }

  /**
   * Save parsed resumes to JSON
   */
  saveParsedResumes(parsedResumes, outputDir) {
    const outputPath = path.join(outputDir, 'parsed_resumes.json');
    fs.writeFileSync(outputPath, JSON.stringify(parsedResumes, null, 2));
    console.log(`✓ Parsed resumes saved to: ${outputPath}`);
  }
}

module.exports = ResumeParser;
