//err=>next(err)    it is same as   next  because the err is throwed to the catch func.
module.exports = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

//we wrapped all Controllers' functions with this func to take all errors in its catch block
//and forward it to the global error handler

//in this function we pass a function definition ==> in order to be triggered when user hits the route.