class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }
  filter() {
    const queryObj = { ...this.queryString };
    const excludedfields = ['page', 'sort', 'limit', 'fields'];
    excludedfields.forEach((el) => delete queryObj[el]);

    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lt|lte)\b/g, (match) => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('createdAt');
    }

    return this;
  }
  fieldLimiting() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }

    return this;
  }

  Pagination() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 10;
    const skip = (page - 1) * limit; //number of documents that we want to skip to get user's docs.

    this.query = this.query.skip(skip).limit(limit); //forth

    return this;
  }
}

module.exports = APIFeatures;

// //Build Query
// //1)basic filtering (filter field that we want)
// const queryObj = { ...req.query };
// const excludedfields = ['page', 'sort', 'limit', 'fields'];
// excludedfields.forEach((el) => delete queryObj[el]);

// //2)advanced filtering  (make less or greater than(see postman))
// let queryStr = JSON.stringify(queryObj);
// queryStr = queryStr.replace(/\b(gte|gt|lt|lte)\b/g, (match) => `$${match}`);

// //we use \b to be sure that around (lt/gt/gte/lte) are not a character

// //////the mongoose's methods returned a query to do more opertaions on it like(sort,limit,...) so important ==>until you make await then it returns docs.
// let query = TourModel.find(JSON.parse(queryStr)); //first

// //3)SORTING     based on fields
// if (req.query.sort) {
//   //to sort 127.0.0.1:3000/api/v1/tours?sort=price,-duration  (-) ===> mean descending.
//   const sortBy = req.query.sort.split(',').join(' ');
//   console.log(sortBy);
//   query = query.sort(sortBy); //second

//   //because sort method can sort a lot of fields like this ===> sort('price duration')
// } else {
//   //the default to sort them ascendingly by created time.
//   query = query.sort('createdAt');
// }

// //4)Field Limiting             (to include some fields and exclude the rest or vice verse)
// if (req.query.fields) {
//   //to include some fields and ignore the rest   is called   projection
//   //127.0.0.1:3000/api/v1/tours?fields=name,duration,price,difficulty ==>to exclude put - before field (either all fields negative or not)
//   const fields = req.query.fields.split(',').join(' ');
//   query = query.select(fields); //third
//   //select('name duration price difficulty')
// } else {
//   //the default to exclude the __v brecause API user does not need it.
//   query = query.select('-__v');
// }

// //5)Pagination
// //if limit=100 and we have 1000 docs then we have 10 pages if the user require page>10 throw an error.
// //127.0.0.1:3000/api/v1/tours?page=4&limit=4
// const page = req.query.page * 1 || 1;
// const limit = req.query.limit * 1 || 1;
// const skip = (page - 1) * limit; //number of documents that we want to skip to get user's docs.

// query = query.skip(skip).limit(limit); //forth

// if (req.query.page) {
//   const numTours = await TourModel.countDocuments();
//   if (skip >= numTours) throw new Error('This page does not exist');
// }

//another mongoose's special methods
// const query =  TourModel.find()
//   .where('duration')
//   .equals(5)
//   .where('difficulty')
//   .equals('easy');

//{difficulty:'easy',duration:{$gte:5}}
//{ duration: { gte: '5' }, difficulty: 'easy' }
