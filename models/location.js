mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
    city: String,
    lat: String,
    lan: String,
    country: String,
    iso2: String,
    admin_name: String,
    capital: String,
    population: String,
    population_proper: String
})

module.exports = mongoose.model("Location", locationSchema);