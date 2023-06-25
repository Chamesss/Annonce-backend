const Notification = require('../models/Notifications');

// Function to create a notification
async function createNotification(userId, adId, message, type) {
  try {
    const notification = await Notification.create({
      userId,
      adId,
      message,
      type
    });
    return notification;
  } catch (error) {
    console.error(error);
    throw new Error('Failed to create notification');
  }
}

// Function to create a welcome notification
async function sendWelcomeNotification(userId, name) {
    const welcomeMessage = `Welcome, ${name}, to our platform!`; 
    return createNotification(userId, null, welcomeMessage, 'welcome');
  }

async function sendUserConfirmationNotification(userId) {
    const confirmationMessage = 'Your account has been successfully activated! You can start adding ads right away.'; // Customize the welcome message as needed
    return createNotification(userId, null, confirmationMessage, 'welcome');
  }
  

// Function to create a review notification
async function sendReviewNotification(userId, adId, adTitle) {
  const reviewMessage = `Your ad ( ${adTitle} ) is under review.`;
  return createNotification(userId, adId, reviewMessage, 'review');
}

// Function to create an accept notification
async function sendAcceptNotification(userId, adId, adTitle) {
  const acceptMessage = `Your ad ( ${adTitle} ) has been accepted.`;
  return createNotification(userId, adId, acceptMessage, 'accept');
}

// Function to create a reject notification
async function sendRejectNotification(userId, adId, adTitle) {
  const rejectMessage = `Your ad ( ${adTitle} ) has not been confirmed.`;
  return createNotification(userId, adId, rejectMessage, 'reject');
}

// Function to create a ban notification
async function sendBanNotification(userId) {
  const banMessage = 'You have been banned from the platform.';
  return createNotification(userId, null, banMessage, 'ban');
}

module.exports = {
  sendWelcomeNotification,
  sendUserConfirmationNotification,
  sendReviewNotification,
  sendAcceptNotification,
  sendRejectNotification,
  sendBanNotification
};