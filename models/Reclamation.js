mongoose = require('mongoose');

const reclamationSchema = new mongoose.Schema({
    userId : { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    adId : { type: mongoose.Schema.Types.ObjectId, ref: 'ad' },
    info : {
        type: String,
        require: true
    }
})

module.exports = mongoose.model("Reclamation", reclamationSchema);