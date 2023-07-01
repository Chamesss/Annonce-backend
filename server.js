mongoose = require('mongoose');
cors = require('cors');
require("dotenv").config();
bodyParser = require('body-parser');
express = require('express');
morgan = require('morgan');
const helmet = require("helmet");
const app = express();
const path = require('path');
const User = require('./routes/UserRoute.js');
const Ad = require('./routes/AdRoute.js');
const Category = require('./routes/CategorisRoute.js');
const Token = require('./services/token');
const AdminVerify = require('./services/admin');
const Admin = require('./routes/AdminRoute');
const Location = require('./routes/LocationRoute');
const Notification = require('./routes/NotificationRoute');


mongoose.connect(process.env.DB_CONNECTION, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('connected !');
  })
  .catch((err) => {
    console.log('Failed to connect: ', err);
  })

app.use(cors({
  credentials: true,
  methods: ["GET", "POST", "DELETE", "PATCH", "PUT"],
  origin: ['http://localhost:3000', 'http://localhost:4200', 'https://kind-rock-0c75e750f.3.azurestaticapps.net/'],
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(helmet());
app.use(express.json());

app.use('/user', User);
app.use('/ad', Ad);
app.use('/category', Category);
app.use('/location', Location);
app.use('/admin', AdminVerify, Admin);
app.use('/getnotifications', Token.verifyToken, Notification);

app.get('/protected', Token.verifyToken, (req, res) => {
  return res.json({ status: true, userId: req.userId });
});
app.get('/verifyadmin', Token.verifyAdmin, (req, res) => {
  return res.json({ status: true })
})

app.all("*", (req, res, next) => {
  res.status(404).json({
    status: "false ",
    message: "Page Note Found !",
  });
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log("app working on port " + port + "..."));