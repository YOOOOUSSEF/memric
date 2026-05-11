const TourModel = require('./../model/tourModel');
const Booking=require('./../model/bookingModel');
const User=require("./../model/userModel")
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');


exports.getOverview = catchAsync(async (req, res, next) => {
  //1)Get Tours data from collection
  const tours = await TourModel.find();

  //2)Build template
  //3)render the template using tours data from 1)
  res.status(200).render('overview', {
    title: 'All Tours',
    tours,
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  //1) Get data for the requested tour (includeing reviews and guides).
  const tour = await TourModel.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user',
  });
  if (!tour) {
    return next(new AppError('There is no tour with that name', 404));
  }
  //2) Build template
  //3)render template using data from 1)
  res.status(200).render('tour', {
    title: `${tour.name} Tour`,
    tour,
  });
});

exports.getLoginForm = (req, res) => {
  res.status(200).render('login', {
    title: 'Log into your account',
  });
};

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your Account',
  });
};


exports.submitUserData=catchAsync(async(req,res,next)=>{
const user=await User.findByIdAndUpdate(req.user._id,{
  name:req.body.name,
  email:req.body.email
},{
  new:true,
  runValidators:true
});

res.status(200).render('account', {
    title: 'Your Account',
    user
  });
});

exports.getMyTours=catchAsync(async(req,res)=>{
  // 1) find all booking then the tours with the return ids.

    const bookings=await Booking.find({user:req.user.id},{tour:1});

    const tourIds=bookings.map(el=>{
      return el.tour;
    })
    const tours= await TourModel.find({_id:{$in:tourIds}});

    res.status(200).render('overview',{
    title: 'Booked Tours',
    tours,
  })
})