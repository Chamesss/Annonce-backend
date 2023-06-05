const NodeGeocoder = require('node-geocoder');
// const {OAuth2Client} = require('google-auth-library');
// const nodemailer = require('nodemailer');
const bcrypt = require("bcrypt");
const mail = require('../smtp.js');
const router = express.Router();
const User = require("../models/User");
const Reclamation = require("../models/Reclamation");
const { body, validationResult } = require("express-validator");
const geocoder = NodeGeocoder({
  provider: 'openstreetmap',
});
const jwt = require('jsonwebtoken');
const upload = require("../utils/cloudinary");
const Upload = require('../utils/multer');
const Token = require('../utils/token');
const Location = require('../models/location');
const Notification = require('../utils/notification');

// const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


//add user google
// const addUserGoogle = async (req, res) => {
//     try {
//       const { token } = req.body;

//       // Verify the Google access token using the OAuth2Client instance
//       const ticket = await client.verifyIdToken({
//         idToken: token,
//         audience: process.env.GOOGLE_CLIENT_ID,
//       });
//       const payload = ticket.getPayload();
//       const email = payload.email;

//       // Create a new user object with the verified Google email
//       const newUser = new User({
//         inscriptionType: 'Google',
//         firstname: payload.given_name,
//         lastname: payload.family_name,
//         email: email,
//         picture: payload.picture,
//         state: 'active',
//         isadmin: false,
//         code: null,
//         codeExpiration: null
//       });

//       // Save the new user object to the database
//       const savedUser = await newUser.save();
//       console.log(`New user ${savedUser.email} added to the database.`);

//       // Send a success response with the new user object
//       res.status(200).json(savedUser);
//     } catch (error) {
//       console.error(`Error adding user: ${error.message}`);

//       // Send an error response with the error message
//       res.status(500).json({ error: error.message });
//     }
//   };


//Register
router.post("/register/:id", Upload.single('file'), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors);
    return res.send(errors);
  }
  const id = req.params.id;
  const {
    firstname,
    lastname,
    tel,
    email,
    password,
    type,
  } = req.body;
  let picture;
  console.log(req.body);
  if (req.file) {
    try {
      picture = await upload(req.file.path);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Error uploading picture" });
    }
  }
  // let location;
  // try {
  //   const geoData = await geocoder.geocode(address);
  //   if (!geoData || !geoData.length) {
  //     return res.status(401).json({ message: 'Invalid address' });
  //   }
  //   const { latitude, longitude } = geoData[0];
  //   location = {
  //     type: 'Point',
  //     coordinates: [longitude, latitude],
  //   };
  // } catch (err) {
  //   console.error(err);
  //   return res.status(500).json({ message: 'Geocoding error' });
  // }
  const existingUser = await User.findOne({ email: email });
  if (existingUser) {
    return res.status(409).json({ message: 'Email already exist' });
  }
  const location = await Location.findById(id).lean();
  console.log(location);
  let profile;
  try {
    profile = new User({
      firstname,
      lastname,
      tel,
      email,
      password,
      picture,
      type,
      country: location.admin_name,
      city: location.city,
      lat: location.lat,
      lng: location.lng,
    });
    const salt = await bcrypt.genSalt(10);
    profile.password = await bcrypt.hash(profile.password, salt);
    profile = await profile.save();
    await Notification.sendWelcomeNotification(profile._id, profile.firstname);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Database error' });
  }
  if (!profile) {
    return res.status(500).json({ message: 'Unable to save user' });
  }
  const token = jwt.sign({ id: profile._id }, process.env.JWT_SECRET,);
  const confirmationLink = `http://localhost:8080/user/activate/${profile._id}`;
  const message = `Please click on this link to activate your account: ${confirmationLink}`;
  try {
    mail.sendEmail(email, message);
    return res.status(201).json({ status: true, message: 'User created. Confirmation email sent.', token: token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error sending confirmation email' });
  }
}
);



// email confirmation function
router.get("/activate/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const existingUser = await User.findById(id);
    if (!existingUser) {
      return res.status(500).json({ message: 'Internal error' });
    }
    if (existingUser.state === true) {
      return res.status(400).json({ message: 'Bad request' });
    }
    existingUser.state = true;
    console.log(existingUser);
    const updatedUser = await existingUser.save();
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    await Notification.sendUserConfirmationNotification(existingUser._id);
    return res.status(200).json({ message: 'User account activated' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Database error' });
  }
}
)



//login function
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email: email });
    console.log(email);
    console.log('exisiting ::: ', existingUser);
    if (!existingUser) {
      return res.status(401).json({ success: false, message: 'Email not found' });
    }
    const isPasswordCorrect = await bcrypt.compare(password, existingUser.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }
    const token = Token.generateToken(existingUser._id);
    return res.status(200).json({ token: token, success: true });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
)



//password reset
router.post("/reset", async (req, res) => {
  try {
    const { email } = req.body;
    const existingUser = await User.findOne({ email: email });
    if (!existingUser) {
      return res.status(404).json({ error: 'Email not found' });
    }
    const code = Math.floor(Math.random() * 900000) + 100000;
    existingUser.code = code;
    const result = await existingUser.save();
    if (result.modifiedCount === 0) {
      console.log(`User document not updated`);
      return res.status(501).json({ success: false });
    } else {
      console.log(`User document updated with code: ${code}`);
      setTimeout(async () => {
        await User.updateOne(
          { email: email },
          { $unset: { code: "" } }
        );
        console.log(`Code deleted for user: ${email}`);
      }, 60 * 1000);
      const message = `Code: ${code}`;
      await mail.sendEmail(email, message);
      console.log('Code is : ', code)
      return res.status(200).json({ success: true, code: code });
    }
  } catch (err) {
    if (err) { return (err); }
  }
  return res.status(500).json({ message: 'Internal server error' });
}
)



//verify code when reset
router.post("/verify", async (req, res) => {
  try {
    const { email, code } = req.body;
    const existingUser = await User.findOne({ email: email });
    if (existingUser.code === code) {
      return res.status(200).json({ success: true, message: 'succeeded' });
    } else {
      return res.status(403).json({ success: false, message: 'Incorrect code' });
    }
  } catch (err) {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
}
)



//edit user
router.patch("/edituser/:id/:locationId", Upload.single('file'), async (req, res) => {
  try {
    const userId = req.params.id;
    const locationId = req.params.locationId;
    const { firstname, lastname, email, oldPassword, newPassword, tel, type, uncheck } = req.body;

    if (uncheck === true) {
      console.log('im heeeeeeeeeeeeeeeeeeeeere')
      const existingUser = await User.findOne({ email: email });
      const encryptedPassword = await bcrypt.hash(newPassword, 10);
      existingUser.password = encryptedPassword;
      const updatedUser = await existingUser.save();
      if (updatedUser) {
        return res.status(201).json({ success: true, user: updatedUser });
      }
    }

    const existingUser = await User.findById(userId);

    const isPasswordValid = await bcrypt.compare(oldPassword, existingUser.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid old password' });
    }

    if (!existingUser) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (newPassword.length > 6 && newPassword !== 'undefined') {
      const encryptedPassword = await bcrypt.hash(newPassword, 10);
      existingUser.password = encryptedPassword;
    }

    if (email.length > 0) {
      if (email !== existingUser.email) {
        const exisitingEmail = await User.findOne({ email: email });
        if (exisitingEmail) {
          return res.status(401).json({ error: 'Email already existing' });
        } else {
          existingUser.email = email;
          existingUser.status = false;
          const confirmationLink = `http://localhost:8080/user/activate/${userId}`
          const message = `Please click on this link to activate your account: ${confirmationLink}`;
          mail.sendEmail(email, message);
        }
      }
    }

    if (locationId !== 'null') {
      const location = await Location.findById(locationId);
      if (!location) {
        return res.status(500).json({ error: 'Server Error' });
      } else {
        const { admin_name, city, lat, lng } = location;
        existingUser.country = admin_name || existingUser.country;
        existingUser.city = city || existingUser.city;
        existingUser.lat = lat || existingUser.lat;
        existingUser.lng = lng || existingUser.lng;
      }
    }
    existingUser.firstname = firstname || existingUser.firstname;
    existingUser.lastname = lastname || existingUser.lastname;
    existingUser.tel = tel || existingUser.tel;
    existingUser.type = type || existingUser.type;

    if (req.file) {
      const picture = await upload(req.file.path);
      existingUser.picture = picture || existingUser.picture;
    }

    const updatedUser = await existingUser.save();

    if (updatedUser) {
      return res.status(201).json({ success: true, user: updatedUser });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});



//get user info
router.get("/getuser", async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Authentication token missing' });
  }
  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.id;
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return res.status(401).json({ message: 'User not found' });
    }
    return res.status(200).json({ status: true, user: existingUser });
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(200).json({ status: false });
    }
    console.error(err);
    return res.status(500).json({ error: 'Internal server error', message: err });
  }
});

router.get("/getuserdetails", async (req, res) => {
  const id = req.headers.id;
  try {
    const existingUser = await User.findById(id);
    if (!existingUser) {
      return res.status(401).json({ message: 'User not found' });
    }
    return res.status(200).json({ status: true, user: existingUser });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error', message: err });
  }
});

router.delete("/deleteuser/:id", async (req, res) => {
  const id = req.params.id;
  const password = req.headers.password;
  try {
    console.log(id);
    console.log(password);
    const existingUser = await User.findById(id);
    if (!existingUser) {
      return res.status(401).json({ message: 'User not found' });
    }
    const passwordMatch = await bcrypt.compare(password, existingUser.password);
    if (!passwordMatch) {
      return res.status(401).json({status:false, message: 'Invalid password' });
    }
    await existingUser.deleteOne();

    return res.status(200).json({ status: true, message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error', message: err });
  }
});




//reclamation
router.post("/reclamation/:iduser/:idad", async (req, res) => {
  try {
    const iduser = req.params.iduser;
    const idad = req.params.idad
    const info = req.body.info;
    console.log(info);
    const rec = new Reclamation({
      userId:iduser,
      adId:idad,
      info:info,
    })
    const isSaved = await rec.save();
    if (isSaved) {
      return res.status(202).json({ success: true, message: "ad has been repported successfully" });
    } else {
      return res.status(500).json({ success: false, message: "an error has accured" });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, error: error });
  }
})

router.get('/send/:email/:iduser', async (req, res) => {
  const email = req.params.email;
  const iduser = req.params.iduser;
  const confirmationLink = `http://localhost:8080/user/activate/${iduser}`;
  const message = `Please click on this link to activate your account: ${confirmationLink}`;
  try {
    mail.sendEmail(email, message);
    return res.status(201).json({ status: true, message: 'Confirmation email successfully sent.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error sending confirmation email' });
  }

})

module.exports = router;