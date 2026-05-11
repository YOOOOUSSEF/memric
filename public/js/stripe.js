import axios from 'axios';
import { showAlert } from './alerts';

//because out api and websit are in the same server we can use relative url, if not we would have to use the full url of the api.
export const bookTour = async (tourId) => {
  try {
    if (typeof Stripe === 'undefined')
      return showAlert('error', 'Payment system failed to load. Please refresh.');

    const stripe = Stripe('pk_test_51TVUpYH7DmcOPOEDKVa8Q4K2uyBKdXgF7i9FqrJNsBZdgPQ4x08mpiEqGc4ooCCtriGizYuCCzQpwOyZrWDs7ORw00MAtTckDC');

    const session = await axios({
      method: 'GET',
      url: `/api/v1/bookings/checkout-session/${tourId}`,
    });

    await stripe.redirectToCheckout({ sessionId: session.data.session.id });
  } catch (err) {
    console.log(err);
    showAlert('error', err.message);
  }
};