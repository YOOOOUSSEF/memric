const express = require('express');
const tourController = require('../controllers/tourController');
const authController = require('./../controllers/authController');
const reviewRouter = require('./reviewRoutes');
// const reviewController = require('./../controllers/reviewController');

const router = express.Router();

// router.param('id',tourController.checkID);

//Nested routes     ----------------------  ((Not logical)) to call reviewController.js in tourRoutes.js
//POST /tours/1363176/reviews
//GET  /tours/746782/reviews
//GET  /tours/746782/reviews/78687

// router
//   .route('/:tourId/reviews')
//   .post(
//     authController.protect,
//     authController.restrictTo('user'),
//     reviewController.createReview,
//   );

//we mount this route to the reviewRouter like in app.js, ((to be more logical)).
router.use('/:tourId/reviews', reviewRouter);

router
  .route('/top-5-cheap')
  .get(tourController.aliasTopTours, tourController.getAllTours);

router.route('/tour-stats').get(tourController.getTourStats);

router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan,
  );

//First  Method   /tours-within?distance=200&center=-40,41&unit=mi      (query string)
//Second Method   /tours-within/200/center/-40,41/unit/mi               (route)        (it is more cleaner to implement)
router.get(
  '/tours-within/:distance/center/:latlng/unit/:unit',
  tourController.getToursWithin,
);

//calc distances of all tours from a certain point.
router.get('/distances/:latlng/unit/:unit', tourController.getDistances);

router
  .route('/')
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.createTour,
  );

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour,
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour,
  );

module.exports = router;
