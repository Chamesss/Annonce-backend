const { listenerCount } = require('nodemailer/lib/xoauth2');
const Ads = require('../models/Ad');
const Users = require('../models/User');
const Reclamation = require('../models/Reclamation');
const router = express.Router();
const Notification = require('../utils/notification');


router.get("/getads", async (req, res) => {
    try {
        const active_ads = await Ads.find({ state: true }).sort({ created: -1 });
        const inactive_ads = await Ads.find({ state: false }).sort({ created: -1 });
        const ads = [...inactive_ads, ...active_ads];
        const ads_count = await Ads.countDocuments({})
        return res.status(202).json({ ads: ads, ads_count: ads_count });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, error: error });
    }
})

router.patch("/adapprove/:id", async (req, res) => {
    try {
        const adId = req.params.id;
        const ad = await Ads.findById(adId);
        ad.state = true;
        await ad.save();
        await Notification.sendAcceptNotification(ad.idUser, ad._id, ad.title)
        return res.status(202).json({ success: true, message: 'Ad approved successfully' });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, error: error })
    }
})

router.delete("/addelete/:id", async (req, res) => {
    try {
        const adId = req.params.id;
        const Ad = await Ads.findById(adId);
        const deletedAd = await Ads.findByIdAndRemove(adId);
        if (deletedAd) {
            await Notification.sendRejectNotification(Ad.idUser, Ad._id, Ad.title);
            return res.status(202).json({ success: true, message: "Ad deleted", ad: deletedAd });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, error: error });
    }
})

router.get("/getusers", async (req, res) => {
    try {
        const users = await Users.find().sort({ createdAt: -1 });
        const user_count = await Users.countDocuments({});
        return res.status(202).json({ users: users, user_count: user_count });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, error: error });
    }
})

router.delete("/deleteuser/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const deletedUser = await Users.findByIdAndRemove(id);
        if (deletedUser) {
            return res.status(202).json({ success: true, message: "user deleted", user: deletedUser });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, error: error });
    }
})

router.post("/banuser/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const exisitingUser = await Users.findById(id);
        exisitingUser.state = false;
        exisitingUser.ban = true;
        await exisitingUser.save();
        await Notification.sendBanNotification(exisitingUser._id);
        return res.status(202).json({success: true});
    } catch (error) {
        console.log(error);
        return res.status(500).json({success: false, error: error});
    }
})

router.get("/getuser", async (req, res) => {
    try {
        const { search } = req.query;
        const users = await Users.find({
            $or: [
                { email: { $regex: search, $options: "i" } },
                { firstname: { $regex: search, $options: "i" } },
            ],
        });
        return res.status(202).json({ success: true, users: users });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, error: error });
    }
})

router.get("/getad", async (req, res) => {
    try {
        const { search } = req.query;
        const ads = await Ads.find({
            $or: [
                { title: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
            ],
        });
        return res.status(202).json({ success: true, ads: ads });
    } catch (error) {   
        console.log(error);
        return res.status(500).json({ success: false, error: error });
    }
})

router.get("/getreclamation", async (req, res) => {
    try {
      const reclamations = await Reclamation.find().lean();
  
      const reclamationData = await Promise.all(reclamations.map(async (reclamation) => {
        const ad = await Ads.findById(reclamation.adId).select('title').lean();
        const user = await Users.findById(reclamation.userId).select('firstname').lean();
  
        return {
          _id: reclamation._id,
          adTitle: ad?.title || '',
          userName: user?.firstname || '',
          info: reclamation.info
        };
      }));
  
      const reclamationCount = await Reclamation.countDocuments({});
      return res.status(200).json({ reclamations: reclamationData, reclamationCount: reclamationCount });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, error: error });
    }
  });

module.exports = router;