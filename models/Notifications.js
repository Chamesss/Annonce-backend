mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    adId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ad' },
    message: { type: String },
    type: { type: String },
    isRead: { type: Boolean, default: false }
  }, { timestamps: true });

  module.exports = mongoose.model("Notification", notificationSchema);