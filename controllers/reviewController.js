const Review = require('./../model/reviewModel');
const catchAsync = require('./../utils/catchAsync');
const factory=require("./handlerFactory");


exports.setTourIdAndUserId=(req, res, next) => {
    //Allow nested routes   (specify them if not given in the body)
    if(!req.body.user)req.body.user=req.user._id;
    if(!req.body.tour)req.body.tour=req.params.tourId;
    next();
}

exports.getAllReviews = factory.getAll(Review);
exports.getReview=factory.getOne(Review);
exports.createReview=factory.createOne(Review);
exports.updateReview=factory.updateOne(Review);
exports.deleteReview=factory.deleteOne(Review);

