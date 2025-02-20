require('dotenv').config();
const express = require('express');
require('./config/dbconfig');
const { RandomNumber } = require('./utils/otphelper');
const { SendEmail } = require('./utils/emailHelper');
const OtpModel = require('./models/otpScheema');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const User = require('./models/userScheema');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.use(
  cors({
    credentials: true,
    origin: process.env.FRONTEND_URL,
  })
);

app.get('/', (req, res) => {
  res.send('AI Backend is Running!');
});

app.post('/otps', async (req, res) => {
  try {
    const { email } = req.body;
    console.log('Received Email:', email);

    if (!email) {
      return res.status(400).json({
        status: 'failure',
        message: 'Email is not present in the parameter',
      });
    }

    const userExists = await User.findOne({ email });
    console.log('User Exists in DB:', userExists); // Debugging log

    if (userExists) {
      return res.status(400).json({
        status: 'failure',
        message: 'User already exists, OTP not sent',
      });
    }

    const otp = RandomNumber();
    console.log('Generated OTP:', otp);

    await SendEmail(email, otp);

    const newSalt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp.toString(), newSalt);
    console.log('Hashed OTP:', hashedOtp);

    await OtpModel.create({ email, otp: hashedOtp });

    return res.status(200).json({
      status: 'success',
      message: 'OTP sent successfully',
    });
  } catch (error) {
    console.error('Error in OTP:', error.message);
    return res.status(500).json({
      status: 'failure',
      message: 'Internal server error',
    });
  }
});

app.post('/users/register', async (req, res) => {
  try {
    const { email, otp, password, name, role, phone, address } = req.body;
    console.log(otp, password);

    if (!email || !otp || !password || !name || !role || !phone || !address) {
      return res.status(400).json({
        status: 'fail',
        message:
          'All fields (email, otp, password, name, role, phone, address) are required.',
      });
    }

    const validRoles = ['resturant', 'ngo', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        status: 'fail',
        message: `Invalid role. Allowed values: ${validRoles.join(', ')}`,
      });
    }

    const isEmailExists = await OtpModel.findOne({ email }).sort('-createdAt');

    if (!isEmailExists) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid email or OTP expired',
      });
    }

    // Compare OTP
    const isOtpCorrect = await bcrypt.compare(
      otp.toString(),
      isEmailExists.otp
    );

    if (!isOtpCorrect) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid OTP',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'fail',
        message: 'Email already registered',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      phone,
      address,
    });

    return res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      user: newUser,
    });
  } catch (error) {
    console.log('Error in user registration:', error.message);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        status: 'fail',
        message: 'Validation error: ' + error.message,
      });
    }

    return res.status(500).json({
      status: 'fail',
      message: 'Internal server error',
    });
  }
});

app.post('/users/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        status: 'fail',
        message: 'email and password are required',
      });
      return;
    }

    const userExists = await User.findOne({ email });
    if (!userExists) {
      res.status(400).json({
        status: 'fail',
        message: 'incorrect email or password',
      });
      return;
    }

    const { password: newpassword, name, _id } = userExists;

    const verifiedPassword = await bcrypt.compare(password, newpassword);

    if (!verifiedPassword) {
      res.status(400).json({
        status: 'fail',
        message: 'password incorrect',
      });
      return;
    }

    const token = jwt.sign(
      {
        email,
        _id,
        name,
      },
      process.env.JWT_SECRET_KEY,
      {
        expiresIn: '1d',
      }
    );

    // console.log(token);

    res.cookie('authorization', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });

    res.status(200).json({
      status: 'success',
      data: {
        email,
        name,
      },
    });
  } catch (error) {
    console.log('error in log in: ', error.message);
    res.status(500).json({
      status: 'fail',
      message: 'Internal server error',
    });
  }
});

app.get('/user/logout', (req, res) => {
  res.clearCookie('authorization');
  res.json({
    status: 'success',
    message: 'logout sucessfully',
  });
});

app.use(cookieParser());

const authorizationMiddleWare = (req, res, next) => {
  const { authorization } = req.cookies;
  console.log('auth: ', authorization);
  if (!authorization) {
    return res.status(401).json({
      status: 'fail',
      message: 'unauthorized',
    });
  }

  jwt.verify(authorization, process.env.JWT_SECRET_KEY, (error, data) => {
    if (error) {
      console.log(error.message);
      res.status(401).json({
        status: 'fail',
        message: 'authrozation failed',
      });
    } else {
      console.log(data);
      req.User = data;
      next();
    }
  });
};

app.get('/users/me', authorizationMiddleWare, (req, res) => {
  try {
    const { email, name } = req.User;
    res.status(200).json({
      status: 'success',
      data: {
        email,
        name,
      },
    });
  } catch (error) {
    console.log(error.message);
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
