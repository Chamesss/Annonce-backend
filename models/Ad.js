mongoose = require('mongoose');

const adSchema = new mongoose.Schema({
    idUser: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    title: { type: String },
    price: Number,
    website: String,
    description: { type: String },
    pictures: {
        type: [String],
        // required: true
    },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    subCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category.subcategories', required: false },
    vocal: String,
    country: String,
    city: String,
    lat: String,
    lng: String,
    state: {
        type: Boolean,
        default: false
    },
}, { timestamps: true });

adSchema.index({ title: "text", description: "text" });
adSchema.index({ location: '2dsphere' });

module.exports = mongoose.model("Ad", adSchema);