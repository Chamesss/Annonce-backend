const jwt = require('jsonwebtoken');
const User = require('../models/User');

function verifyToken(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.id;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
}

async function verifyAdmin(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized'});
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const iduser = decoded.id;
        const exisitingUser = await User.findById(iduser);
        if (!exisitingUser){
            return res.status(400).json({ message: 'corrupted token detected'})
        }
        if (exisitingUser.isAdmin === false){
            return res.status(401).json({ message: 'unauthorized '})
        } else {
            next();
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: error});
    }
}

function generateToken(userId) {
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXP });
    return token;
}

module.exports = { verifyToken, verifyAdmin, generateToken };