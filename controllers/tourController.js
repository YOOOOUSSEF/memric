// const fs = require('fs');
// const tours = JSON.parse(fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`));
const TourModel = require('./../model/tourModel');
const multer = require('multer');
const sharp = require('sharp'); //image processing
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');

// exports.checkBody=(req,res,next)=>{
//   const {name,price}=req.body;

//   if(!name || ! price)
//   {
//     return res.status(400).json({status:"fail",message:'invalid price or name'})
//   }

//   next();
// }

// //middleware has fourth value is the id that sent in url.
// exports.checkID=(req,res,next,val)=>{
//   console.log(`the id is ${val}`)

//   if (req.params.id * 1 >= tours.length) {
//     return res
//     .status(404)
//     .json({ status: 'fail', message: 'invalid ID' });
//   }

//   next();
// }

const multerStorage = multer.memoryStorage(); //store image in memory so you can process it efficiently.

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! please upload an image', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

//for mix of them(req.files)
exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  //console.log(req.files);
  if (!req.files.imageCover || !req.files.images) return next();

  req.body.imageCover=`tour-${req.params.id}-${Date.now()}-cover.jpeg`;

  // 1) imageCover process
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000,1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  // 2) images process (we use Promise.all here to wait until all the returned promises to be solved.)(we use map instead of forEach because map save the objects in array which in this case are promises).
  req.body.images=[];
  await Promise.all(req.files.images.map(async(file,index)=>{
    const filename=`tour-${req.params.id}-${Date.now()}-${index+1}.jpeg`;

    await sharp(req.files.images[index].buffer)
      .resize(2000,1333)
      .toFormat('jpeg')
      .jpeg({ quality: 90 })
      .toFile(`public/img/tours/${filename}`);

    req.body.images.push(filename);
  }));

  next();
});

//upload.single('imageCover'); //for single image(req.file)
//upload.array('images'); //for multiple images(req.files)

//aliasing concept ==> because this route is required a lot.
exports.aliasTopTours = (req, res, next) => {
  req.url =
    req.path +
    '?limit=5&sort=-ratingsAverage,price&fields=name,price,difficulty,ratingsAverage,summary';

  //we write in req.url because req.query is written on it because app.set('query parser', 'extended');

  next();
};

exports.getAllTours = factory.getAll(TourModel);
exports.getTour = factory.getOne(TourModel, { path: 'reviews' });
exports.createTour = factory.createOne(TourModel);
exports.updateTour = factory.updateOne(TourModel);
exports.deleteTour = factory.deleteOne(TourModel);

exports.getTourStats = catchAsync(async (req, res, next) => {
  //Aggregation pipeline (the aggregate function has a lot of stages =>every stage output go to the next stage)
  //Every stage is an object.
  const stats = await TourModel.aggregate([
    {
      //like Filter
      $match: { ratingsAverage: { $gte: 1 } },
    },
    {
      $group: {
        // _id:null  ==> mean group all tours within one group.
        // _id: '$ratingsAverage' ==> mean group tours based on ratingsAverage.
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 }, //For each doc entering the pipeline add 1
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: { avgPrice: 1 }, //1 for ascending , -1 for descending
    },
    //you can repeat stages - $ne mean get docs/groups that _id not equal 'EASY'
    // {
    //   $match: { _id: { $ne: 'EASY' } },
    // },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;

  const plan = await TourModel.aggregate([
    {
      //$unwind ==> sepearte array to (elements of the array) each element with same docs.
      $unwind: '$startDates',
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        //$month is a mongodb operator to get month from date value.
        _id: { $month: '$startDates' },
        numToursStarts: { $sum: 1 },
        Tours: { $push: '$name' }, //$push ==> to add each doc's name, to make array Tours for each group.
      },
    },
    {
      //to add new fields and give it a value that i want.
      $addFields: { month: '$_id' },
    },
    {
      $project: {
        //0 => to exclude some fields && get the rest / 1 => include some fields && ignore the rest.
        _id: 0,
      },
    },
    {
      $sort: { numToursStarts: -1 },
    },
    {
      //to limit the number of docs shown to the API user.
      $limit: 12,
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});

// '/tours-within/:distance/center/:latlng/unit/:unit'
// /tours-within/200/center/30.082657, 31.261555/unit/mi

exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  //default 'kilo' ==> we divide by earth radius so radius be in radian.
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longtiude in the format lat,lng',
        400,
      ),
    );
  }

  //put lng first in array.   (you can see more geoSpatial operators in mongo document).
  const tours = await TourModel.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  // console.log(distance, lat, lng, unit);
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      tours,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371192 : 0.001;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longtiude in the format lat,lng',
        400,
      ),
    );
  }

  const distances = await TourModel.aggregate([
    {
      //this is the only geoSpatial aggregation pipeline.
      //to work (one of our fields must have a geoSpatial index) and $geoNear will use this index automatically in calculations.
      //if you have multiple of fields that have a geoSpatial index (then you must use the keys parameter in order to define the field that you want to use in calculations).
      $geoNear: {
        near: {
          //near  ==>  the point that you want to calc distances from it.
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: 'distance', //distanceField  ==> the field name that will has the value.
        distanceMultiplier: multiplier, //to divide the distance by 1000 so be in kilometres or another for mile.
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      distances,
    },
  });
});
