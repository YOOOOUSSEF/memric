const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const APIFeatures = require('./../utils/APIFeatures');

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError('No document was found with this ID', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return next(new AppError('No document was found with ID', 404));
    }

    //TourModel.updateOne({_id:req.params.id},{$set:req.body})
    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

// const newTour=new TourModel({});
// newTour.save().then().catch()
exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const newDoc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        data: newDoc,
      },
    });
  });

//TourModel.findOne({_id:req.params.id}) ===>  findById is a shorthand.
exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    //console.log(query)
    if (popOptions) query = query.populate(popOptions);

    const doc = await query;

    if (!doc) {
      return next(new AppError('No document was found with ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    //Allow nested routes for getAllReviewsOnTour      (hack)
    let filter = {};
    if (req.params.tourId) filter.tour = req.params.tourId;

    //Execute Query
    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .fieldLimiting()
      .Pagination();

    //explain() ==>get the details of the query.
    // const docs = await features.query.explain();
    const docs = await features.query;

    //Send Response
    res.status(200).json({
      status: 'sucess',
      results: docs.length,
      data: {
        data: docs,
      },
    });
  });

//cloures in js ===>  make the inner function can use the paramters of outer function
// even after outer function called it.
