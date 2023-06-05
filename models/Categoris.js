mongoose = require('mongoose');

const subcategorySchema = new mongoose.Schema({
    name: { type: String },
    picture: { type: String }
});
  
const categorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    picture: { type: String, required: true },
    subcategories: [subcategorySchema]
});

module.exports = mongoose.model('Category', categorySchema);