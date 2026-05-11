const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('./../model/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const Email = require('./../utils/email');
const { promisify } = require('util');

//first Argument  => payload(put user data that you need)
//second Argument => secret/privateKey
//options or callback or both in array.
//it is a synchronous func, when you don't provide a callback func.
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  ///////////////////////////////////////////////////////   create cookie and send it to browser

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000, //to delete the cookie from the browser, after JWT token expires.
    ),
    httpOnly: true, //so the cookie can't accessed or modified in browser (to prevent xss attack)
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true; //so it is only sent over a secure connection HTTPS

  res.cookie('jwt', token, cookieOptions); //the name 'jwt' is uniquely identified for the cookie.
  /////////////////////////////////////////////////////////////////////////////////////////////////////

  //remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signUp = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role,
  });

  const url = `${req.protocol}://${req.get('host')}/me`;
  //console.log(url);
  await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //1)check if the password and email exist
  if (email === undefined || password === undefined) {
    return next(new AppError(`Fields Email and password are required`, 400));
  }
  //check if user exists and password is correct.
  const user = await User.findOne({
    email,
  }).select('+password');
  //+password ==> mean add it to the object because it is (select:false) make it abondend.
  //(select:false) in password ==> we make because of getAllUsers func to not put the passwords of the users.

  if (!user || !(await user.passwordCorrect(password, user.password))) {
    throw new AppError(`Invalid Email or Passworrd`, 401);
    //401 is for unauthorized Access.
  }

  //3)id everything is okay, sent token back to client.
  createSendToken(user, 200, res);
});

/////////////////////////////////////////////////      log out out out
exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(
      Date.now() + 10 * 1000, //10 seconds life
    ),
    httpOnly: true,
  });

  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  //1)getting token and check if it is there.
  let token;

  //Now we can authorize user from token via cookie or authorization header.
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('You are not logged in!. Please log in to get access', 401),
    );
  }

  //2)verification token (we used promisify because jwt.verify is asynchronous and we need to make it sync)
  //if can not get the decoded payload it will throw error from itself.
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //3)check if user still exists (not deleted)
  const currentUser = await User.findById(decoded.id);
  if (!currentUser)
    throw new AppError(
      'the user belonging to this token is no longer exist.',
      401,
    );

  //4)check if user changed password after the token was issued.
  if (currentUser.changePasswordAfter(decoded.iat)) {
    throw new AppError(
      'user recently changed password. Please log in again!.',
      401,
    );
  }

  //Grant Access to protected Route
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

// This middleware for rendered pages, NOT ERRORS!
exports.isLoggedIn = async (req, res, next) => {
  //verify token
  if (req.cookies.jwt) {
    try {
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      );

      //3)check if user still exists (not deleted)
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) return next();

      //4)check if user changed password after the token was issued.
      if (currentUser.changePasswordAfter(decoded.iat)) return next();

      //There is a Logged In user
      res.locals.user = currentUser; //all pug templates will see this variable like if i sent using object in res.render
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

//this func to strict for any roles--------------
//only admin and lead-guide only the ones who can delete a tour. (403 is forbidden)
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('you do not have permission to perform this action', 403),
      );
    }

    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1)get user based on posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('No user is found with this email address', 404));
  }

  //2)generate the random reset token
  const resetToken = user.createPasswordResetToken();
  //we save the doc after adding fields passwordResetToken && passwordResetExpire USING createPasswordResetToken function
  //we run this {validateBeforeSave:false} to not run schema so does not require password and others.
  await user.save({ validateBeforeSave: false });

  //3)send it to user's email
  try {
    const resetPasswordURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
    await new Email(user, resetPasswordURL).sendPasswordReset();

    //we sent the token(resetToken) by email address not json because it is safer, the user only has access to it.
    res.status(200).json({
      status: 'success',
      message: 'Token is sent to email!',
    });
  } catch (err) {
    //Important to clear those. If an error happen.
    user.passwordResetToken = undefined;
    user.passwordResetExpire = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'there was an error sending this email. try again later!',
        500,
      ),
    );
  }
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////
exports.resetPassword = catchAsync(async (req, res, next) => {
  //1)get user based on the token
  const hashedPassword = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedPassword,
    passwordResetExpire: { $gt: Date.now() },
  });

  //2)If token has not expired, and there is user, set the new password.
  if (!user) {
    return next(new AppError('Invalid or Expired token'), 400);
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpire = undefined;
  await user.save(); //we run save (((Not))) update so(document mongoose middlewares can run)
  //document mongoose middlewares (one that encrypts password and one updates passwordChangedAt)

  //3)update changePasswordAt property for the user (at userModel.js document mongoose middleware)

  //4)Log the user in, send jwt
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1)get user from the collection (the user that authenticated from middleware (protect))
  const currentUser = await User.findById(req.user._id).select('+password');

  //2)check if posted password is correct
  if (
    !(await currentUser.passwordCorrect(
      req.body.passwordCurrent,
      currentUser.password,
    ))
  ) {
    throw new AppError('your current password is wrong', 401); //401 unauthorized access
  }

  //3)if so, update his password.
  currentUser.password = req.body.password;
  currentUser.passwordConfirm = req.body.passwordConfirm;
  await currentUser.save(); //we run save (((Not))) update so(document mongoose middlewares and schema validators can run)
  //document mongoose middlewares (one that encrypts password and one updates passwordChangedAt)

  //4)log user in, send jwt
  createSendToken(currentUser, 200, res);
});
