const mongoose = require('mongoose');
const dotenv = require('dotenv');

//we subscribe on the event before any exception(unexcpected) error happen because of our code.
process.on("uncaughtException",(err)=>{
  console.log(err.name,"   ", err.message);
  console.log('Unhandled Exception 💥 We are shutting down......');

    process.exit(1); 
});

dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<db_password>',
  process.env.DATABASE_PASSWORD,
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('DB connection is successful //');
  });

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`App is listening on port ${port}`);
});

//unhandledRejection ===> for errors like I can not connect with mongodb.
//when emit event unhandledRejection =>call the callback func.
//we subscribe on this event.
process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log('Unhandled Rejection 💥 We are shutting down......');

  server.close(() => { 
    process.exit(1); //1 for uncaught exception /0 for success
  });
});

// console.log(x)  the  Unhandled Exception will catch the error and shutdown.


//for eslint and prettier formatting and detection syntax errors and some of them for node js only.
//eslint is about codeing rules and prettier is about code formatting.

// npm i eslint prettier
// eslint-config-prettier
//  eslint-plugin-prettier
//  eslint-config-airbnb
//  eslint-plugin-node
//   eslint-plugin-import
//  eslint-plugin-jsx-a11y
//  eslint-plugin-react
//  --save-dev
