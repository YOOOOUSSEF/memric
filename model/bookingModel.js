const mongoose=require('mongoose');


const BookingSchema=new mongoose.Schema({
    tour:{
        type:mongoose.Schema.ObjectId,
        ref:'TourModel',
        required:[true,'Booking must belong to a Tour!']
    },
    user:{
        type:mongoose.Schema.ObjectId,
        ref:'User',
        required:[true,'Booking must belong to a User']
    },
    price:{
        type:Number,
        required:[true,'Booking must have a price']
    },
    createdAt:{
        type:Date,
        default:Date.now()
    },
    paid:{   //in case we want to save a booking for one of user who will pay cashly, so we can use this field to know if the booking is paid or not.
        type:Boolean,
        default:true
    }
});

BookingSchema.pre(/^find/,function(next){
    this.populate('user').populate({
        path:'tour',
        select:'name'
    });
    next();
})



const Booking=mongoose.model('Booking',BookingSchema);

module.exports=Booking;