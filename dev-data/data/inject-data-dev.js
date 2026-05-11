const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
dotenv.config({ path: './config.env' });
const TourModel = require('../../model/tourModel');
const User = require('./../../model/userModel');
const Review = require('./../../model/reviewModel');

const DB = process.env.DATABASE.replace(
  '<db_password>',
  process.env.DATABASE_PASSWORD,
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('DB connection is successful //');
  });

const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf8'));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf8'));
const reviews = JSON.parse(
  fs.readFileSync(`${__dirname}/reviews.json`, 'utf8'),
);

//import Data in DB

const importData = async () => {
  try {
    //await TourModel.create(tours); //also create method can accept an array of abjects.
    await User.create(users, { validateBeforeSave: false });
    //await Review.create(reviews, { validateBeforeSave: false });
    console.log('Data successfully loaded....!');
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

///Delete all data from DB

const deleteData = async () => {
  try {
    //await TourModel.deleteMany({});
    await User.deleteMany({});
    //await Review.deleteMany({});
    console.log('Data successfully deleted....!');
  } catch (err) {
    cosnole.log(err);
  }
  process.exit();
};

if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
}

// console.log(process.argv)
