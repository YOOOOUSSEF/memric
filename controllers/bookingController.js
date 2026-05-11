const stripe=require('stripe')(process.env.STRIPE_SECRET_KEY);//we pass the secretKey to give us a stripe object to work with.
const TourModel = require('./../model/tourModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');
const Booking=require('./../model/bookingModel')

exports.getCheckoutSession=catchAsync(async(req,res,next)=>{
    // 1) Get the currently Booked Tour.
    const tour=await TourModel.findById(req.params.tourId);
    console.log(tour)

    // 2) Create checkout session.
    const session=await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types:['card'],                       //credit card

        //this url is not secure at all, Because if anyone know the url we can make booking without have to pay.
        success_url:`${req.protocol}://${req.get('host')}/?user=${req.user.id}&tour=${req.params.tourId}&price=${tour.price}`,   //user redirected to this url when the payment succeed.
        cancel_url:`${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
        customer_email:req.user.email,
        client_reference_id:req.params.tourId,
        line_items: [
    {
      quantity: 1,

      price_data: {
        currency: 'usd',
        unit_amount: tour.price * 100,

        product_data: {
          name: `${tour.name} Tour`,
          description: tour.summary,
          images: [
            `http://127.0.0.1:3000/img/tours/${tour.imageCover}`
          ],
        },
      },
    },
  ],
});

    // 3) send it to the client as a response.
    res.status(200).json({
        status:'success',
        session
    })
});

exports.createBookingCheckout=catchAsync(async(req,res,next)=>{
  //this is only Temporary: because it is not secure: anyone can bookings without payment.
  const {user,tour,price}=req.query;

  if(!user&&!tour&&!price) return next();  //after redirection then it will come through next()
  await Booking.create({user,tour,price});


  res.redirect(req.originalUrl.split('?')[0]);
});

exports.getBookings=factory.getAll(Booking);
exports.getBooking=factory.getOne(Booking);
exports.createBooking=factory.createOne(Booking);
exports.updateBooking=factory.updateOne(Booking);
exports.daleteBooking=factory.deleteOne(Booking);