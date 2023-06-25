const User = require('../models/User');
const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Authentication token missing, please log in..' });
        }
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decodedToken.userId;
        const existingUser = User.findById(userId);
        if (existingUser.isadmin = false) {
            return res.status(403).json('u are not admin user...');
        }
        next();
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: error })
    }
}