const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');
// const User=require('./userModel') for embedding
//we didn't specify a required option for some fields because it is calculated during app working.
const tourSchema = new mongoose.Schema(
  {
    //definition section
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      //these built-in validators are for String only
      maxlength: [40, 'A tour must have name less than or equal 40'],
      minlength: [10, 'A tour must have name greater than or equal 10'],
      // //this validator package is on github.
      // validate: [
      //   validator.isAlpha,
      //   'A tour name must contain characters only',
      // ],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a maxGroupSize'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      //this built-in validator is for String only
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either easy, medium, difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      //these built-in validators are for Number only
      min: [1, 'A tour must have a ratingsAverage greater than or equal 1.0'],
      max: [5, 'A tour must have a ratingsAverage less than or equal 5.0'],
      //this function runs every time NEW VALUE set to this field.
      set: (val) => Math.round(val * 10) / 10, //4.6666666 => 46.666666 => 47 => 4.7
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      //custom validator (validate): to check if priceDiscount is less than price if true make the create
      // if no return error

      //this custom validator is only work (when adding new docs) not update or anything else.
      validate: {
        //val is a priceDiscount value and this object is the current document.
        validator: function (val) {
          return this.price > val;
        },
        //for strange reason the value of val the message can access it.
        message: `A priceDiscount {VALUE} must less than the price`,
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a summary'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String], //array of strings
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false, //so this createdAt field willn't be sent to the API user.
    },
    secretTour: {
      type: Boolean,
      default: false,
    },
    startDates: [Date], //array of Dates  (many instances of the tour)

    //we make the first location as a seperate field to be more clear.
    startLocation: {
      //GeoJSON
      type: {
        //there are another shapes(lines,polygons,...)
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      //latitude and longitude  (latitude is the horizontal distance from equator)
      coordinates: [Number],
      address: String,
      description: String,
    },
    //Embedded documents  (array of objects)
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    //guides:Array ==> for embedding
    guides: [
      // for child referencing
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User', //so mongoose can populate this field with User data.
      },
    ],
  },
  {
    //here in options section ==> we tell that we need virtual properites to appear in docs either json
    //  or js object.
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

//we here created virtual field not persisted in db but calculated when get docs from the db.
//we use here regular function instead of arraow function because (this object) is not in arrow func.
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

//Virtual populate (we make child referencing to reviews but it is virtual Not persisting in db)
tourSchema.virtual('reviews', {
  ref: 'Review', //so mongoose can populate this field with review data.
  foreignField: 'tour', //the name of the parent reference in reviewModel for tours.
  localField: '_id', //the field of connection in tour document.
});
//1) DOCUMENT MIDDLEWARE:  runs before .save()  and  .create() and not insertMany or One
//we can called it => pre save middleware or pre hook middleware
//it runs before  the actual saving in db.                        important
//this object  point at the currently being saved object(future document in db).
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

//but we will make it child referncing because of duplicate data and updating.
// //loop on ids of guides and return the user corresponding to every id.(to embedding users inside tours)
// tourSchema.pre('save',async function(next){
//   //array of promises
//   const guidesPromises=this.guides.map(async id=>{
//     return await User.findById(id);
//   })
//   this.guides=await Promise.all(guidesPromises);
//   next();
// })

////we can run a lot of pre and post hook middlewares.
// tourSchema.pre('save', function (next) {
//   console.log('saving to the db.....');
//   next();
// });

// //post hook middleware has no access for (this object) but it has access to the document that
// //has been saved to the db as doc parameter.

// //it runs after  the actual saving in db.                       important
// tourSchema.post('save', function (doc, next) {
//   console.log(doc);
//   next();
// });

//2) Query Middleware
//this object will point (to the current query not document).     ==>  important
//middlewares to process the query.
// tourSchema.pre('find', function (next) {
tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } });

  this.start = Date.now();
  next();
});

//it will fill the guides with docs of users as if it is an embedded.
//populate is an important mongoose tool, To fill specific field for child referencing.
tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt', //to not show those fields
  });
  next();
});

//we make /^find/ Not 'find' => to make the middleware work on all mongoose methods that start with find.
//this work after the query has executed, so it has docs like post document middleware.
tourSchema.post(/^find/, function (docs, next) {
  console.log(
    `the time take to execute the query in db is ${Date.now() - this.start} milliseconds`,
  );
  // console.log(docs);
  next();
});

// //Aggregation Middleware  (before aggregate func execution)
// tourSchema.pre('aggregate', function (next) {
//   //to not put the (docs with secretTour:false) into your account.
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });

//   // console.log(this.pipeline()); the method that has (all the stages/pipelines) of aggregate opration.
//   next();
// });

//beacause it is a real point on earth so '2dsphere' but if in 2d plane not real so '2d' only.
//you must make this so mongo can handle geoSpatial locations.
tourSchema.index({ startLocation: '2dsphere' });
//It increases the read performance but it take size more than the docs themselves (balance)
tourSchema.index({ price: 1, ratingsAverage: 1 }); //compound field index (1:asc,-1:des)
tourSchema.index({ slug: 1 }); //single field index

const TourModel = mongoose.model('TourModel', tourSchema);

module.exports = TourModel;
