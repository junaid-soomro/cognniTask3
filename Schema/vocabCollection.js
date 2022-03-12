var mongoose = require("mongoose");

const schema = new mongoose.Schema({}, { strict: false });
schema.index({ "vocabCollection.term": 1 });
const vocabSchema = mongoose.model("tokenizerVocab", schema, "tokenizerVocab");

module.exports = vocabSchema;
