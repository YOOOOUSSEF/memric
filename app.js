const path = require('path');
const express = require('express');
const morgan = require('morgan');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');
const bookingRouter=require('./routes/bookingRoutes');

const app = express();

//Serving static Files
// // app.use(express.static(`${__dirname}/public`));
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'pug'); //to set pug as our template engine
app.set('views', path.join(__dirname, 'views'));

// 1) GLOBAL MIDDELWARES
//Set  security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          'https://api.mapbox.com',
          'https://js.stripe.com',       // ✅ allow Stripe script to load
        ],
        styleSrc: [
          "'self'",
          'https://api.mapbox.com',
          'https://fonts.googleapis.com',
          "'unsafe-inline'",
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        connectSrc: [
          "'self'",
          'https://api.mapbox.com',
          'https://events.mapbox.com',
          'https://api.stripe.com',      // ✅ allow Stripe API calls
        ],
        frameSrc: [
          "'self'",
          'https://js.stripe.com',       // ✅ allow Stripe's iframe
        ],
        imgSrc: ["'self'", 'data:', 'blob:'],
        workerSrc: ["'self'", 'blob:'],  // needed by Mapbox
      },
    },
  })
);

//limit requests  from same API
const limiter = rateLimit({
  max: 100, //max number of requests
  windowMs: 60 * 60 * 1000, //the time for this max num of requests in milliseconds
  message: 'Too many requests from this IP, Pleas try again in an hour!', //message when exceeding the limit
});
app.use('/api', limiter); //set rate limiting on all routes

//Body Parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' })); //if user sent body more than 10kb, it will not be accepted.
app.use(cookieParser());
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

//Data sanitization against Nosql query injection.
app.use(mongoSanitize()); //it filter out any ($) and (.) in req.body or.query or.params.  like in {"$gt",""}

//Data sanitization against XSS
app.use(xss()); //this will clean any user input from malicious HTML code(it translates it to something safe)
//also mongoose schema is strict and also (validators of mongoose built in or custome)

//prevent parameter pollution  (like doubling query parameters ?sort=duration&sort=price  gives us error
//without hpp.)
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsAverage',
      'ratingsQuantity',
      'maxGroupSize',
      'difficulty',
      'price',
    ], //to accept duplicates from some fields (so expected behaviour be true)
  }),
); //with hpp ==> it clear the query string, and it takes the last one in dublicates.

//makes Express use qs library, which parses nested queries.(modifies in req.query && makes it not modifiable)
app.set('query parser', 'extended');

//Development Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

//Test middleWare
app.use((req, res, next) => {
  req.requestedTime = new Date().toISOString();
  //console.log(req.headers);  //take a look at headers
  //console.log(req.cookies);
  next();
});

// app.use((req, res, next) => {
//   console.log('hello from the first middelware');

//   // console.log(x); in here when the middleware called and the error happen, express sent it to
//   //the global error handling middleware
//   next();
// });

// 3)ROUTES
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings',bookingRouter);

//Handling undefined routes '*'
//app.all  is for all verbs (get,put,delete,patch,post)
app.all('*', (req, res, next) => {
  //   // res
  //   //   .status(404)
  //   //   .json({
  //   //     status: 'fail',
  //   //     message: `Can't find ${req.originalUrl} on this server`,
  //   //   });

  //   // const errUn = new Error(`Can't find ${req.originalUrl} on this server`);
  //   // errUn.statusCode = 404;
  //   // errUn.status = 'fail';

  //no matter what you sent in (((next func))).
  //it will consider that parameter as (((error))) !!!!! and jump to global error handling middleware.
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

//global error handling middleware
//it is ready for us in express, express know it because it takes 4 parameters.
app.use(globalErrorHandler);

module.exports = app;
