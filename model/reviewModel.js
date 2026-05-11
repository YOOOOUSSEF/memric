const mongoose = require('mongoose');
const TourModel = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not be embty!'],
      minlength: [5, 'A review must have greater than or equal 5'],
      maxlength: [100, 'A review must have less than or equal 100'],
    },
    rating: {
      type: Number,
      default: 1,
      min: [1, 'A review has a rating greater than or equal 1.0'],
      max: [5, 'A review has a rating less than or equal 5.0'],
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user.'],
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'TourModel',
      required: [true, 'Review must belong to a tour.'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

//we make the compound index (tour,user) unique so each user can review each tour one time.
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

//every call for populate mean another new query, which make the performance more slower.
reviewSchema.pre(/^find/, function (next) {
  //we turn oFF populate for tour because we do not need it especially in getTour.
  // this.populate({
  //   path: 'tour',
  //   select: 'name',
  // }).populate({
  //   path: 'user',
  //   select: 'name photo',
  // });

  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});

//static method in mongoose (we can call the function using the Review model.)
reviewSchema.statics.calculateAverageRating = async function (tourId) {
  //this is point to the current model ((Review)).
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      //we group by the tourId then calc the numOfReviews and the average of them.
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  console.log(stats);

  //if no review document has this tourId, the stats array will be empty.
  if (stats.length > 0) {
    await TourModel.findByIdAndUpdate(tourId, {
      ratingsAverage: stats[0].avgRating,
      ratingsQuantity: stats[0].nRating,
    });
  }
  else{
    await TourModel.findByIdAndUpdate(tourId, {
      ratingsAverage: 4.5,
      ratingsQuantity: 0,
    });
  }
};

//so whenever you add a review it updates the rating average and quantity. 
//we use post here so the document has been saved to the db.
reviewSchema.post('save', function () {
  //this points to the current document review. (this.constructor will point to the ((model Review)))
  this.constructor.calculateAverageRating(this.tour);
});


//so whenever you update or delete a review it updates the rating average and quantity. 
//findByIdAndUpdate  ==>  is a shorthand for findOneAndUpdate.
//findByIdAndDelete  ==>  is a shorthand for findOneAndDelete.
//we use post here so the document has been saved to the db  ((after executing the query)).
reviewSchema.post(/^findOneAnd/, function (doc, next) {
  doc.constructor.calculateAverageRating(doc.tour);
  next();
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
