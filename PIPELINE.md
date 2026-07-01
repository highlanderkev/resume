# Resume Data Extraction Pipeline

A comprehensive Node.js pipeline for extracting, parsing, and analyzing resume data from multiple formats (PDF, TXT, JSON).

## Features

✨ **Multi-Format Extraction**
- Extract text from PDF files
- Parse text (.txt) files
- Identify structured data from unstructured text

🔍 **Intelligent Parsing**
- Automatic extraction of contact information (email, phone, URLs)
- Work experience parsing
- Education history extraction
- Skills and keywords detection
- Certification identification

📊 **Comprehensive Analysis**
- Skills frequency analysis
- Company and position tracking
- Contact information aggregation
- URL extraction and cataloging
- Detailed JSON reports

📝 **Rich Output Formats**
- Structured JSON data files
- Markdown reports
- Analysis summaries
- Human-readable extraction reports

## Installation

```bash
npm install
```

This installs:
- `pdf-parse` - PDF text extraction
- `pdfjs-dist` - PDF processing library
- All existing dependencies

## Usage

### Quick Start

Run the complete pipeline:

```bash
npm run pipeline
```

Or with a clean slate:

```bash
npm run pipeline:full
```

### Individual Commands

**Extract raw data only:**
```bash
npm run extract
```

**Parse extracted data:**
```bash
npm run parse
```

**Clean output directory:**
```bash
npm run pipeline:clean
```

## Pipeline Architecture

```
input files (old_resumes/, other_resumes/)
           ↓
    [Extraction Stage]
      - Read files
      - Extract text from PDFs
      - Parse text files
      - Extract contact info & URLs
           ↓
    [Parsing Stage]
      - Identify resume sections
      - Parse work experience
      - Extract education
      - Identify skills
           ↓
    [Analysis Stage]
      - Aggregate skills
      - Analyze work history
      - Generate statistics
      - Create reports
           ↓
output files (extracted_data/)
```

## Output Files

The pipeline generates several output files in the `extracted_data/` directory:

| File | Description |
|------|-------------|
| `extracted_resumes.json` | Complete extraction with all metadata |
| `pdf_extractions.json` | PDF-specific extracted data |
| `txt_extractions.json` | Text file extractions |
| `extraction_summary.json` | Metadata about extraction process |
| `EXTRACTION_REPORT.md` | Human-readable extraction report |
| `parsed_resumes.json` | Structurally parsed resume data |
| `analysis.json` | Statistical analysis and aggregations |
| `ANALYSIS_REPORT.md` | Comprehensive markdown analysis report |

## Data Structure

### Extracted Resume Object

```json
{
  "filename": "Resume-Kevin-Westropp.pdf",
  "path": "./old_resumes/Resume-Kevin-Westropp.pdf",
  "text": "...",
  "pages": 2,
  "metadata": {
    "keywords": ["TypeScript", "AWS", "React"],
    "hasEmail": ["kevin@example.com"],
    "hasPhoneNumber": ["+1-303-555-1234"],
    "hasLinks": ["https://github.com/highlanderkev"]
  }
}
```

### Parsed Resume Object

```json
{
  "source": "Resume-Kevin-Westropp.pdf",
  "basics": {
    "name": "Kevin Westropp",
    "email": "kevin@example.com",
    "phone": "+1-303-555-1234",
    "location": "Denver, Colorado"
  },
  "work": [
    {
      "name": "Company Name",
      "position": "Senior Engineer",
      "duration": "2020-Present"
    }
  ],
  "skills": [
    {
      "name": "Languages",
      "keywords": ["TypeScript", "Python"]
    }
  ]
}
```

## Supported Skills Detection

The pipeline automatically detects and categorizes skills from resumes:

- **Languages**: TypeScript, Python, JavaScript, Java, Go, Rust, etc.
- **Frontend**: React, Vue, Angular, Next.js, Svelte
- **Backend**: Node.js, Django, FastAPI, Spring
- **Databases**: PostgreSQL, MongoDB, Redis, DynamoDB
- **Cloud**: AWS, Azure, Google Cloud
- **DevOps**: Docker, Kubernetes, CI/CD, Terraform
- **Other**: Git, GraphQL, REST, Microservices

## Contact Information Extraction

Automatically extracts and catalogs:
- 📧 Email addresses (RFC-compliant regex)
- 📱 Phone numbers (multiple formats supported)
- 🔗 URLs (HTTP/HTTPS links)

## Analysis Reports

### Skills Analysis
Identifies the most frequently mentioned skills across all resumes with frequency counts.

### Work Experience Analysis
- Unique companies mentioned
- Unique positions held
- Sample company and position listings

### Education Analysis
- Degree types detected
- Number of unique institutions
- Educational background distribution

## Configuration

To modify extraction behavior, edit the following constants in the source files:

**extract-resumes.js:**
```javascript
const FOLDERS = ['./old_resumes', './other_resumes'];
const OUTPUT_DIR = './extracted_data';
```

**Skill Detection Keywords:**
Edit the `skillKeywords` array in `resume-parser.js` to add custom skills.

## Error Handling

The pipeline includes robust error handling:
- Failed PDF extractions are logged but don't stop the process
- Missing folders are detected and skipped
- File read/write errors are caught and reported
- Summary statistics include failure counts

## Performance

Pipeline performance depends on:
- Number of resume files (typically 10-30 files takes <30 seconds)
- PDF file sizes (complex PDFs may take longer)
- System resources (CPU and memory usage is minimal)

## Troubleshooting

**Issue: PDFs not extracting properly**
- Some PDFs with unusual formatting may not extract cleanly
- Check the `EXTRACTION_REPORT.md` for which files had issues
- Try manual text extraction from problematic PDFs

**Issue: Email/phone not detected**
- Check the regex patterns in `extract-resumes.js`
- Some formatting variations may not be captured
- Manually add missing contact info to extracted JSON

**Issue: Skills not detected**
- Add new skill keywords to the `skillKeywords` object in `resume-parser.js`
- Run the pipeline again

**Issue: Running npm run pipeline gives module errors**
- Ensure dependencies are installed: `npm install`
- Delete `node_modules/` and reinstall: `rm -rf node_modules && npm install`

## Development

The pipeline is built with modular Node.js scripts:

- `extract-resumes.js` - Raw data extraction
- `resume-parser.js` - Data parsing and structuring
- `pipeline.js` - Orchestration and reporting

Each module can be imported and used independently in your own scripts.

## Future Enhancements

Potential improvements:
- [ ] Database storage for extracted data
- [ ] Web UI for viewing results
- [ ] REST API for accessing extracted data
- [ ] Machine learning for better skill detection
- [ ] Support for image-based resume extraction (OCR)
- [ ] Comparison and deduplication of similar resumes
- [ ] Export to various formats (CSV, Excel, XML)

## License

MIT - See LICENSE file for details

## Contributing

Contributions are welcome! Please submit pull requests with improvements.

---

**Last Updated:** 2024-06-30
**Version:** 1.0.0
