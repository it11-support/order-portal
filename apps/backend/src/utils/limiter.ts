import rateLimit from "express-rate-limit";

export const defaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: "Too Many Requests",
    message: "Too many requests, please try again after an hour",
  }
})

export const imageReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    message: 'Too many image requests, please try again after an hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const imageUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
