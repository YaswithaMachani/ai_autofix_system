/** API entry — delegates to scripts/autofix.js pipeline */
const { runAutofixPipeline, applyFixFiles } = require('../../scripts/autofix');

module.exports = { runAutofixPipeline, applyFixFiles };