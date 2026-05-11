import axios from 'axios';
import { showAlert } from './alerts';



export const bookTour= async (TourId)=>{
    try{
 if (typeof Stripe === 'undefined') {
        return showAlert('error', 'Payment system failed to load. Please refresh.');
    }

    const stripe = Stripe('pk_test_51TVUpYH7DmcOPOEDKVa8Q4K2uyBKdXgF7i9FqrJNsBZdgPQ4x08mpiEqGc4ooCCtriGizYuCCzQpwOyZrWDs7ORw00MAtTckDC');        
    // 1) Get checkout session from Api
        const session=await axios({
        method: 'GET',
        url: `http://127.0.0.1:3000/api/v1/bookings/checkout-session/${TourId}`,
        });
        console.log(session)


    // 2) create checkout form + charge credit card
        await stripe.redirectToCheckout({
            sessionId:session.data.session.id
        });
    }catch(err){
        console.log(err);
        showAlert('error',err);
    }

}


