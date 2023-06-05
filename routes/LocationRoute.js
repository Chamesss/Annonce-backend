const Location = require("../models/location");
const router = express.Router();

router.get('/get', async (req,res) => {
    try {
        const locations = await Location.find();
        if (locations) {
            return res.status(200).json({success: true , locations: locations});
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({success: false, error:error});
    }
})

module.exports = router;