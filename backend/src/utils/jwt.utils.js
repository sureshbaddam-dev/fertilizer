import jwt from 'jsonwebtoken';
import { envConfig } from '../config/env.config.js';

export const generateAccessToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, envConfig.jwt.secret, {
    expiresIn: envConfig.jwt.expiresIn,
  });
};

export const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, envConfig.jwt.refreshSecret, {
    expiresIn: envConfig.jwt.refreshExpiresIn,
  });
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, envConfig.jwt.secret);
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, envConfig.jwt.refreshSecret);
};
