mongoose = require('mongoose');

const favoritesSchema = new mongoose.Schema({
    ads: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ad' }],
})

module.exports = mongoose.model("Favorites", favoritesSchema);