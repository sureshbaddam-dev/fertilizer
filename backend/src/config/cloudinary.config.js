import { v2 as cloudinary } from 'cloudinary';
import { envConfig } from './env.config.js';

if (envConfig.cloudinary.cloudName && envConfig.cloudinary.apiKey && envConfig.cloudinary.apiSecret) {
  cloudinary.config({
    cloud_name: envConfig.cloudinary.cloudName,
    api_key: envConfig.cloudinary.apiKey,
    api_secret: envConfig.cloudinary.apiSecret,
    secure: true,
  });
}

export { cloudinary };
