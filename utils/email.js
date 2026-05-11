const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');
//new Email(user,url).sendWelcome()

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `${process.env.EMAIL_FROM}`;
  }

  //create different transports for different environments.
  newTransporter() {
    if (process.env.NODE_ENV === 'production') {
      //sendgrid
      return nodemailer.createTransport({
        service:'SendGrid',
        auth:{
            user:process.env.SENDGRID_USERNAME,
            pass:process.env.SENDGRID_PASSWORD
        }
      });
    }

    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  //send the email ONLY
  async send(template, subject) {
    // 1) render HTML based on a pug template.
    const html = pug.renderFile(
      `${__dirname}/../views/emails/${template}.pug`,
      {
        firstName: this.firstName,
        url: this.url,
        subject,
      },
    );

    // 2) define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject: subject,
      html,
      text: htmlToText.fromString(html), //text version of the msg
    };

    //) 3) create a transport and send the email.
    await this.newTransporter().sendMail(mailOptions);
  }
  async sendWelcome() {
    await this.send('welcome', 'welcome to the Natours Family!');
  }
  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token (valid for only 10 minutes)',
    );
  }
};

// //1) create a transporter (using Gmail)
// const transporter=nodemailer.createTransport({
//     service:'Gmail',
//     auth:{
//         user:process.env.EMAIL_USERNAME,
//         pass:process.env.EMAIL_PASSWORD
//     }
//     //activate in Gmail "less secure app" option
// });
