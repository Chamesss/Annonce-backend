const mongoose = require('mongoose');
const geolib = require('geolib');
const NodeGeocoder = require('node-geocoder');
const Ad = require("../models/Ad");
const Favorites = require("../models/Favorites")
const user = require("../models/User");
const fs = require('fs');
const verifyToken = require('../utils/token');
const router = express.Router();
const Upload = require('../utils/multer');
const upload = require("../utils/cloudinary");
const audioUpload = require("../utils/audioupload");
const vm = require("v-response");
const _ = require("underscore");
const jwt = require('jsonwebtoken');
const { nextTick } = require('process');
const Location = require('../models/location');
const Notification = require('../utils/notification');
const geocoder = NodeGeocoder({
  provider: 'openstreetmap',
});



//create ad
router.post("/create/:idlocation", Upload.fields([
  { name: 'audio', maxCount: 1 },
  { name: 'picture', maxCount: 6 }
]), async (req, res) => {
  try {
    const { title, price, website, description, categoryId, subCategoryId = null } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Authentication token missing, please log in..' });
    }
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    let idUser = '';
    if (decodedToken) {
      idUser = decodedToken.id;
    } else {
      return res.status(401).json({ message: 'you must login to see this page' })
    }
    const idLocation = req.params.idlocation;
    const location = await Location.findById(idLocation).lean();
    if (!req.files || _.isEmpty(req.files)) {
      return res
        .status(400)
        .json(vm.ApiResponse(false, 400, "No file uploaded'"));
    }
    const existingUser = await user.findOne({ _id: idUser });
    if (!existingUser) {
      return res.status(401).json({ message: 'User not found. Internal error' });
    }
    if (existingUser.state != true) {
      return res.status(403).json({ message: 'permission denied' });
    }
    // const geoData = await geocoder.geocode(address);
    // if (!geoData || !geoData.length) {
    //   return res.status(422).json({ message: 'Invalid address' });
    // }
    // const longitude = geoData[0].longitude;
    // const latitude = geoData[0].latitude;
    let audioUrl = '';
    try {
      if (req.files['audio']) {
        audioUrl = await audioUpload(req.files['audio'][0].path);
      }
    } catch (err) {
      return res.status(500).json('error uploading audio');
    }
    const pictureFiles = req.files['picture'];
    const imageUrls = [];
    for (const file of pictureFiles) {
      const url = await upload(file.path);
      imageUrls.push(url);
    }
    const newAdData = new Ad({
      idUser,
      title,
      price,
      website,
      description,
      categoryId,
      pictures: imageUrls,
      subCategoryId,
      vocal: audioUrl,
      country: location.admin_name,
      city: location.city,
      lat: location.lat,
      lng: location.lng
    });
    if (subCategoryId && mongoose.Types.ObjectId.isValid(subCategoryId)) {
      newAdData.subCategoryId = subCategoryId;
    }
    const newAd = new Ad(newAdData);
    const savedAd = await newAd.save();
    await Notification.sendReviewNotification(idUser, newAd._id, newAd.title)

    return res.status(201).json({ ad_id: savedAd._id, status: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
)



//get ads
router.get("/get", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const searchQuery = req.headers.searchquery;
    const categoryId = req.headers.categoryid;
    const subcategoryId = req.headers.subcategoryid;
    const locationId = req.headers.locationid;
    let idUser = '';
    const filter = { state: true };
    const sort = { addedDate: -1 };
    let coords = [];
    let favoriteAds = [];
    let city = '';

    if (authHeader !== '') {
      try {
        const token = authHeader && authHeader.split(' ')[1];
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        idUser = decodedToken.id;
        const existingUser = await user.findOne({ _id: idUser });;
        coords = [+existingUser.lng, +existingUser.lat];
        city = existingUser.city;
      } catch (error) {
        console.log(error);
      }
    }
    console.log(idUser);
    console.log('rabouuuuuuuuuuukkkkkkkkkkkkkk');

    if (locationId) {
      const existingLocation = await Location.findById(locationId);
      coords = [+existingLocation.lng, +existingLocation.lat];
      city = existingUser.city; // Note: existingUser might not be available if the token is expired or invalid
    }

    if (categoryId) {
      filter.categoryId = categoryId;
      if (subcategoryId) {
        filter.subcategoryId = subcategoryId;
      }
    }

    if (searchQuery) {
      filter.$or = [
        { title: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } },
      ];
      sort.addedDate = -1;
    }

    if (idUser) {
      const favoriteDocs = await Favorites.findOne({ _id: idUser });
      if (favoriteDocs) {
        favoriteAds = favoriteDocs.ads;
      }
    }


    let ads = await Ad.find(filter)
      .sort(sort)
      .limit(20);

    if (coords.length > 0) {
      ads = ads.map(ad => ({
        ...ad.toObject(),
        distance: geolib.getDistance(
          { latitude: coords[1], longitude: coords[0] },
          { latitude: ad.lat, longitude: ad.lng }
        )
      }));
      ads.sort((a, b) => a.distance - b.distance);
    }

    if (idUser) {
      ads = ads.map(ad => ({
        ...ad,
        isFav: favoriteAds.includes(ad._id.toString())
      }));
    }

    ads = ads.map(ad => {
      return {
        _id: ad._id,
        title: ad.title,
        description: ad.description,
        country: ad.country,
        website: ad.website,
        city: ad.city,
        lat: ad.lat,
        lng: ad.lng,
        price: ad.price,
        vocal: ad.vocal,
        category: ad.categoryId,
        subcategory: ad.subCategoryId,
        location: ad.location,
        pictures: ad.pictures,
        distance: ad.distance || null,
        isFavorite: ad.isFav || false,
        createdAt: ad.createdAt,
        idUser: ad.idUser,
      };
    });

    console.log("yabaaaaa", ads);

    return res.status(200).json({ ads });
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(200).json({ ads: ads });
    }
    console.error(err);
    return res.status(500).json({ error: 'Internal server error', message: err });
  }
});

router.get("/details", async (req, res) => {
  const idAd = req.headers.idad;
  const authHeader = req.headers.Authorization;
  const token = authHeader && authHeader.split(' ')[1];

  try {
    const decodedToken = token ? jwt.verify(token, process.env.JWT_SECRET) : null;
    const idUser = decodedToken ? decodedToken.id : null;
    console.log(idAd);

    const ad = await Ad.findById(idAd);
    if (!ad) {
      return res.status(404).json({ message: 'Ad not found' });
    }

    if (ad.state !== true) {
      return res.status(401).json({ message: 'Ad still in review.. you are not supposed to see this page!' });
    }

    let isFavorite = false;
    if (idUser) {
      try {
        isFavorite = await Favorites.exists({ ads: ad._id, _id: idUser });
      } catch (error) {
        console.error(error);
      }
    }

    return res.status(200).json({
      success: true,
      ad: {
        _id: ad._id,
        addedDate: ad.addedDate,
        idUser: ad.idUser,
        title: ad.title,
        price: ad.price,
        description: ad.description,
        picturesTable: ad.picturesTable,
        categoryId: ad.categoryId,
        subCategoryId: ad.subCategoryId,
        vocal: ad.vocal,
        pictures: ad.pictures,
        location: ad.location,
        address: ad.address,
        state: ad.state,
        date: ad.createdAt,
        website: ad.website,
      },
      isFavorite: !!isFavorite,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error', message: err });
  }
});

router.patch("/editad/:idAd/:idLocation", Upload.fields([
  { name: 'audio', maxCount: 1 },
  { name: 'picture', maxCount: 6 }
]), async (req, res) => {
  const idlocation = req.params.idLocation;
  try {
    const ad = await Ad.findOne({ _id: req.params.idAd });
    const title = req.body?.title;
    const price = req.body?.price;
    const website = req.body?.website;
    const description = req.body?.description;
    const categoryid = req.body?.categoryid;
    const subcategoryid = req.body?.subcategoryid;
    ad.title = title || ad.title;
    ad.price = price || ad.price;
    ad.website = website || ad.website;
    ad.description = description || ad.description;
    ad.categoryid = categoryid || ad.categoryid;
    ad.subcategoryid = subcategoryid || ad.subcategoryid;
    if (idlocation !== 'null') {
      const location = await Location.findById(idlocation);
      if (!location) {
        return res.status(500).json({ error: 'Server Error' });
      } else {
        const { admin_name, city, lat, lng } = location;
        ad.country = admin_name || ad.country;
        ad.city = city || ad.city;
        ad.lat = lat || ad.lat;
        ad.lng = lng || ad.lng;
      }
    }
    try {
      if (req.files['audio']) {
        let audioUrl = await audioUpload(req.files['audio'][0].path);
        ad.vocal = audioUrl;
      }
    } catch (err) {
      return res.status(500).json('error uploading audio');
    }
    try {
      if (req.files['pictures']) {
        const pictureFiles = req.files['picture'];
        const imageUrls = [];
        for (const file of pictureFiles) {
          const url = await upload(file.path);
          imageUrls.push(url);
        }
        ad.pictures = imageUrls;
      }
    } catch (err) {
      return res.status(500).json('error uploading pictures')
    }
    await ad.save();
    return res.status(200).json({ success: true });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: error.message });
  }
}
)

router.delete("/delete/:idAd", async (req, res) => {
  const idAd = req.params.idAd;
  try {
    const ad = await Ad.findOneAndDelete({ _id: idAd });
    if (!ad) {
      return res.status(404).send({ message: 'Ad not found' });
    }
    res.status(200).json({ success: true, message: 'Ad deleted successfully' });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
}
)


router.post("/adfavorite/:idUser/:idAd", async (req, res) => {
  const { idUser, idAd } = req.params;
  try {
    const existingUser = await user.findOne({ _id: idUser });
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const existingAd = await Ad.findOne({ _id: idAd });
    if (!existingAd) {
      return res.status(404).json({ success: false, message: 'Ad not found' });
    }
    const existingFavorites = await Favorites.findOne({ _id: idUser });
    if (!existingFavorites) {
      await Favorites.create({ _id: idUser, ads: idAd });
      return res.status(201).json({ success: true, message: 'Ad has been set to favorites!' });
    } else {
      const existingIdAd = await Favorites.findOne({ _id: idUser, ads: { $in: [idAd] } }).exec();
      if (existingIdAd) {
        console.log(existingIdAd);
        console.log('Ad already exists in favorites !')
        return res.status(409).json({ message: 'Ad already exists in favorites !' })
      }
      const updatedFavorites = await Favorites.updateOne(
        { $addToSet: { ads: idAd } }
      );
      if (updatedFavorites) {
        return res.status(201).json({ success: true, message: 'Ad has been set to favorites!' });
      }
    }
  } catch (error) {
    console.error(`Error adding ad to favorites: ${error.message}`);
    return res.status(501).json({ success: false, error: error.message });
  }
}
)

router.get("/getfavorites/:idUser", async (req, res) => {
  const idUser = req.params.idUser;
  try {
    const existingFavorites = await Favorites.findOne({ _id: idUser }).populate('ads');
    if (!existingFavorites) {
      return res.status(200).json({ success: true, state: false, message: 'User does not have any favorite ads', favorites: [] });
    } else {
      const favoriteAds = await Ad.find({ _id: { $in: existingFavorites.ads } });
      const favoritesWithIsFavorite = favoriteAds.map(ad => ({
        ...ad.toObject(),
        isFavorite: true
      }));
      return res.status(200).json({ success: true, state: true, message: 'Favorite ads retrieved successfully', favorites: favoritesWithIsFavorite });
    }
  } catch (error) {
    console.error(`Error retrieving favorite ads: ${error.message}`);
    return res.status(501).json({ success: false, error: error.message });
  }
});

router.delete("/deletefavorite/:idUser/:idAd", async (req, res) => {
  const { idUser, idAd } = req.params;
  try {
    const existingUser = await user.findOne({ _id: idUser });
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const existingFavorites = await Favorites.findOne({ _id: idUser });
    if (!existingFavorites) {
      return res.status(404).json({ success: false, message: 'Favorites not found' });
    } else {
      const adIndex = existingFavorites.ads.indexOf(idAd);
      if (adIndex === -1) {
        return res.status(404).json({ success: false, message: 'Ad not found in favorites' });
      } else {
        existingFavorites.ads.splice(adIndex, 1);
        if (existingFavorites.ads.length === 0) {
          await Favorites.deleteOne({ _id: idUser });
        } else {
          await Favorites.findOneAndUpdate({ _id: idUser }, existingFavorites);
        }
        return res.status(200).json({ success: true, message: 'Ad removed from favorites' });
      }
    }
  } catch (error) {
    console.error(`Error deleting ad from favorites: ${error.message}`);
    return res.status(501).json({ success: false, error: error.message });
  }
}
)

router.get('/specific', async (req, res) => {
  const id = req.headers.id;
  try {
    const ad = await Ad.find({ idUser: id });
    if (ad.length > 0) {
      return res.status(200).json({ success: true, state: true, ad: ad });
    } else {
      return res.status(200).json({ success: true, state: false })
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, error: error });
  }
})

module.exports = router;