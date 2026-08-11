/**
 * Resume Pipeline - Programmatic API
 * Exports all pipeline modules for use by AI agents and other scripts.
 */

'use strict';

const ResumeExtractor = require('./extract-resumes.js');
const ResumeParser = require('./resume-parser.js');
const PipelineOrchestrator = require('./pipeline.js');

module.exports = {
  ResumeExtractor,
  ResumeParser,
  PipelineOrchestrator
};
