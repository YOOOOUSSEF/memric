const crypto = require('crypto'); //built-in library in node.js
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name!'],
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid format email'],
  },
  photo: {
    type:String,
    default:'default.jpg'
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [8, 'A password should have at least 8 characters'],
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm a password'],
    //this custom validator is only work (when adding new docs(create,save)) not update or anything else.
    validate: {
      validator: function (val) {
        return val === this.password; //if return false, it means it is a validation error.
      },
      message: 'Passwords are not the same.',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpire: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

userSchema.pre('save', async function (next) {
  //Only run this func if the password was actually modified
  //isModified method is a method in all docs.
  if (!this.isModified('password')) return next();

  //hash the password with cost of 12.
  this.password = await bcrypt.hash(this.password, 12);

  //Delete passwordConfirm field. (it is requird only when user enters the input to check password correction)
  //not to preserve it in the db.
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', function (next) {
  //we check that password change, and the doc is not newly created.
  if (!this.isModified('password') || this.isNew) return next();

  //we subtract 1 second, because at sometimes the token issued before the document actually saved.
  //we subtract 1 second to make sure that token issued after password changed.
  this.passwordChangedAt = Date.now() - 1000;

  next();
});
//////////////////////////////////////////////////////////////////////////////////////query middleware
userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });

  next();
});
//Now this function is in all docs  that created from userSchema.(to check password correctness)
userSchema.methods.passwordCorrect = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

//this function check if user changed his password after token changed if yes return true
//if no return false and in authController.protect function take an acion based on it
//if he changed the password ,do not allow to get resource by the token issued after
//password changed  (best security)
userSchema.methods.changePasswordAfter = function (JWTtimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    return JWTtimestamp < changedTimestamp;
  }

  // false means password was NOT changed after token was issued.
  return false;
};

//crearte reset token encrypted to put in db, to compare it with the value that user entered.
userSchema.methods.createPasswordResetToken = function () {
  //random string token              (that will be sent to user)
  const resetToken = crypto.randomBytes(32).toString('hex'); //hex => 0-9 and a-f only. (64 characters) (32 bytes) (256 bits) (very strong token)

  //encrypted   random string token  (that will be saved in db)
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpire = Date.now() + 10 * 60 * 1000; //make the token valid for 10 minutes

  //console.log({ resetToken }, this.passwordResetToken);
  return resetToken;
};

//convention model variables names ==> is the first letter is uppercase.
const User = mongoose.model('User', userSchema);

module.exports = User;
