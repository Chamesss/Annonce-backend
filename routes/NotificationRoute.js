const router = require("./UserRoute");
const Notification = require('../models/Notifications');


router.get('/', async (req, res) => {
  const userId = req.userId;
  try {
    const notifications = await Notification.find({ userId: userId }).sort({ createdAt: -1 });
    return res.status(200).json({ notifications: notifications });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to retrieve notifications' });
  }
});

router.post('/seen', async (req, res) => {
  const userId = req.userId;
  try {
    await Notification.updateMany({ userId: userId }, { isRead: true });
    return res.status(202).json({status: true});
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;