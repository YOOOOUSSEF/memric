const AppError = require('./../utils/appError');
const handleTokenExpiredError = () =>
  new AppError('Your token has expired. Please Log in again', 401);

const handleJsonWebTokenError = () => {
  const message = 'Invalid token. Please Log in again!';
  return new AppError(message, 401);
};
const handleCastErrorDB = (error) => {
  const message = `Invalid ${error.path}: ${error.value}`;
  return new AppError(message, 400);
};
const handleDuplicateKeyErrorDB = (error) => {
  const message = `Duplicate field value: "${Object.values(error.keyValue)[0]}" Please use another value!`;
  return new AppError(message, 400);
};
const handleValidationErrorDB = (error) => {
  let allErrors = Object.values(error.errors).map((el) => el.message);

  const message = `ValidationError: ${allErrors.join('. ')}`;
  return new AppError(message, 400);
};

const sendErrorDev = (err, req, res) => {
  //API
  if (req.originalUrl.startsWith('/api')) {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      stack: err.stack,
      message: err.message,
    });
  }
  //RENDERED WEBSITE
  else {
    console.error('ERROR 💥', err);
    res.status(err.statusCode).render('error', {
      title: 'something went wrong!',
      msg: err.message,
    });
  }
};

const sendErrorProd = (err, req, res) => {
  // A)  API
  if (req.originalUrl.startsWith('/api')) {
    //Opertional, Trusted Error: send message to the client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });

      //Programming or other unknown error: don't leak error details
    }
    //1)log error  (this error will appear in the console of the platform that you will deploy in.)
    console.error('ERROR 💥', err);
    //2)send generic message
    return res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!',
    });
  }

  //B) rendered WEBSITE
  //Opertional, Trusted Error: send message to the client
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'something went wrong!',
      msg: err.message,
    });

    //Programming or other unknown error: don't leak error details
  }
  //1)log error  (this error will appear in the console of the platform that you will deploy in.)
  console.error('ERROR 💥', err);
  //2)send generic message
  return res.status(err.statusCode).render('error', {
    title: 'something went wrong!',
    msg: 'Please Try again later.',
  });
};

module.exports = (err, req, res, next) => {
  err.status = err.status || 'error';
  err.statusCode = err.statusCode || 500;

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    //to make the error operational && trusted && show it to user with a friendly way.
    let error = { ...err };
    error.message = err.message;
    error.name = err.name;

    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateKeyErrorDB(error);
    if (error.name === 'ValidationError')
      error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJsonWebTokenError();
    if (error.name === 'TokenExpiredError') error = handleTokenExpiredError();

    sendErrorProd(error, req, res);
  }
};
