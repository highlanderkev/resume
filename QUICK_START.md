# 🚀 Quick Start Guide - Resume Pipeline

## One-Command Setup

```bash
npm run pipeline:full
```

This will:
1. ✨ Clean the `extracted_data/` directory
2. 📂 Process all files from `old_resumes/` and `other_resumes/`
3. 🔍 Extract text, contacts, URLs, and skills
4. 📊 Parse resumes into structured format
5. 📈 Generate analysis reports
6. 📄 Create JSON and Markdown outputs

## Output Files

After running the pipeline, check `extracted_data/` for:

- **ANALYSIS_REPORT.md** - Executive summary with charts and insights
- **analysis.json** - Structured analysis data (APIs, etc.)
- **extracted_resumes.json** - Raw extracted data with metadata
- **parsed_resumes.json** - Formatted resume data

## Key Features

| Feature | What It Does |
|---------|-------------|
| 🎯 Skill Detection | Finds 25+ technical skills (TypeScript, AWS, React, etc.) |
| 📞 Contact Extraction | Finds emails, phone numbers, URLs |
| 📋 Resume Parsing | Extracts work, education, projects, certifications |
| 📊 Analytics | Compares skills, tracks companies, analyzes experience |
| 📝 Reports | Generates markdown and JSON reports |

## Example Output

```json
{
  "skills": [
    { "skill": "TypeScript", "count": 2 },
    { "skill": "AWS", "count": 2 },
    { "skill": "React", "count": 1 }
  ],
  "allUrls": [
    "https://github.com/highlanderkev",
    "https://linkedin.com/in/kevinwestropp"
  ],
  "workExperience": {
    "uniqueCompanies": 2,
    "uniquePositions": 1
  }
}
```

## Individual Commands

```bash
# Extract only (no parsing/analysis)
npm run extract

# Clean output directory
npm run pipeline:clean

# Run full pipeline again
npm run pipeline
```

## Customize It

Edit these files to customize behavior:

- **extract-resumes.js** - Change folders, add/remove skill keywords
- **resume-parser.js** - Modify parsing logic, add custom sections
- **pipeline.js** - Adjust analysis, reporting

## Integration

Use extracted data in your workflow:

```javascript
const data = require('./extracted_data/analysis.json');
console.log('Top skills:', data.skills);
```

## Troubleshooting

**Q: PDF files not extracting?**
A: Some PDFs are encrypted or complex. The pipeline focuses on TXT files which work reliably.

**Q: Want to add more skills?**
A: Edit `skillKeywords` object in `resume-parser.js`

**Q: How to export to CSV?**
A: Use `extracted_data/analysis.json` with your favorite tool

---

**Ready to go!** Run `npm run pipeline:full` and check `extracted_data/` for results.
