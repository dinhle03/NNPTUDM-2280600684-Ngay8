// // file: utils/mailHandler.js
// const nodemailer = require("nodemailer");

// const sendEmail = async (options) => {
//   // Cấu hình gửi qua GMAIL
//   const transporter = nodemailer.createTransport({
//     service: "gmail",
//     auth: {
//       user: "levandinh231@gmail.com",
//       pass: "lgoe evnx ycmm sqow",
//     },
//   });

//   const mailOptions = {
//     from: '"Hệ thống Quản lý" <levandinh231@gmail.com>',
//     to: options.email,
//     subject: "Thông tin tài khoản mới - " + options.username,
//     html: `
//       <h3>Chào ${options.username},</h3>
//       <p>Tài khoản của bạn đã được khởi tạo thành công trên hệ thống.</p>
//       <p><b>Thông tin đăng nhập:</b></p>
//       <ul>
//         <li><b>Username:</b> ${options.username}</li>
//         <li><b>Mật khẩu:</b> <span style="color: red; font-weight: bold;">${options.password}</span></li>
//       </ul>
//       <p>Vui lòng đăng nhập và đổi mật khẩu để bảo mật tài khoản.</p>
//       <br/>
//       <p>Trân trọng!</p>
//     `,
//   };

//   return await transporter.sendMail(mailOptions);
// };

// module.exports = sendEmail;
// file: utils/mailHandler.js
const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  // Cấu hình Mailtrap để bắt các email giả @haha.com
  const transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    auth: {
      user: "c5252e39384052", 
      pass: "b9c9f50d472662",
    },
  });

  const mailOptions = {
    from: '"Hệ thống Admin" <admin@haha.com>',
    to: options.email,
    subject: "Thông tin tài khoản mới - " + options.username,
    html: `
      <h3>Chào ${options.username},</h3>
      <p>Tài khoản của bạn đã được khởi tạo thành công.</p>
      <p><b>Username:</b> ${options.username}</p>
      <p><b>Mật khẩu:</b> <span style="color: red;">${options.password}</span></p>
      <p>Vui lòng đăng nhập hệ thống.</p>
    `,
  };

  return await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;