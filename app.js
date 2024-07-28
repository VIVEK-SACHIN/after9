const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit'); //for putting a rate limit
const helmet = require('helmet'); //use for additional security header and made of other small 14 headers
const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');
const hpp = require('hpp');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewrouter');

const app = express();

// 1)GLOBAL MIDDLEWARES
//SET security http headers
app.use(helmet()); //use as early in the middleware stack as possible
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
//this limiter will allow us to prevent too many requests from the same IP helping us to eradicate denial of serveice attacks and bruteforce attacks.
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000, //in this duration it will check that requests does not exeed above limit
  message: 'Too many requests from this IP,please try again in an hour!' //error message ip requesting more requests than this will receive
});
app.use('/api', limiter);
//parse json body to req.body
app.use(express.json({ limit: '10kb' }));

//DATA sanitization against nosql querry injection
//for example in the body someone instead of username or email pass {"$gt":""} then also it will match with all documents and if attacker somehow manges to guess or randomly fill password that matches any of the stored documents password then he will get the acess
app.use(mongoSanitize());
//data sanitization against xss attacks -this will then clean all the malicious html input(by convertiong all the html symbols )
app.use(xssClean());
//use hpp to avoid polluting of routes it will create an array for feilds with multiple values to avoid we can use this middle where which will force it to use the latest value in case of middle where where you want to make array you can use options and pass whitelist
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price'
    ]
  })
);
//serve static fikle on the server
app.use(express.static(`${__dirname}/public`));
//to set request time on the req
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// 3) ROUTES
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
//anyother path should here
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;

//data sanitization basically means to clean up all the data that comes into the application from malicious code i.e code that is trying to attack our application
