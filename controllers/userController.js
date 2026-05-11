const User = require('./../model/userModel');
const multer = require('multer');
const sharp = require('sharp'); //image processing
const catchAsync = require('./../utils/catchAsync');
const fs = require('fs');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');

//our multer middleWare for downloading images in disk (it can be used for any type of files).
/*const multerStorage=multer.diskStorage({
  destination:(req,file,cb)=>{
    cb(null,'public/img/users')
  },
  filename:(req,file,cb)=>{
    const ext=file.mimetype.split('/')[1];
    cb(null,`user-${req.user._id}-${Date.now()}-.${ext}`)
  }
})*/
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

exports.uploadUserPhoto = upload.single('photo');//photo is the name of the field in the form that will have the image.(single->one image)

exports.resizeUserPhoto =  catchAsync(async(req, res, next) => {
  if (!req.file) return next();

  req.file.filename=`user-${req.user._id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })                           //reduce the resolution to 90%
    .toFile(`public/img/users/${req.file.filename}`);// save it to the desk

    next();
});

const filterObj = (obj, ...allowedFields) => {
  //'keyName' in obj
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) {
      newObj[el] = obj[el];
    }
  });
  return newObj;
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user._id;
  next();
};

///////////////////////////////////////////////////////////////////////////////////////////////////////
exports.updateMe = catchAsync(async (req, res, next) => {
  console.log(req.file);
  console.log(req.body);

  //1)create error if user posts password data.
  if (req.body.password || req.body.passwordConfrim) {
    return next(
      new AppError(
        'This route is not for password updates, please use /updateMyPassword',
      ),
      400,
    );
  }

  //2)filtered out unwanted fields name, that are not allowed to be updated.
  const filteredBody = filterObj(req.body, 'name', 'email');
  if (req.file) filteredBody.photo = req.file.filename;

  //3)update user document
  const updatedUser = await User.findByIdAndUpdate(req.user._id, filteredBody, {
    new: true,
    runValidators: true,
  }); //we run validtors only not mongoose doc middleware because it is not sensitive data like password.

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});
///////////////////////////////////////////////////////////////////////////////////////////////////////
exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user._id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
///////////////////////////////////////////////////////////////////////////////////////////////////////
exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'this route is not defined yet please use /signup instead',
  });
};

exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
exports.updateUser = factory.updateOne(User); //Not update for password.
exports.deleteUser = factory.deleteOne(User);
