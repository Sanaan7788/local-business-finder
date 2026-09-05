import winston from 'winston';

// Reads NODE_ENV directly rather than importing config: modules that only need
// logging (the Postgres mappers, standalone scripts such as export-static)
// must not trigger the app's env validation, which also demands an LLM key.
const isProduction = process.env.NODE_ENV === 'production';

const { combine, timestamp, colorize, printf, json, errors } = winston.format;

const devFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} [${level}]: ${message}${metaStr}`;
});

export const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: combine(errors({ stack: true }), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })),
  transports: [
    new winston.transports.Console({
      format: isProduction
        ? combine(timestamp(), json())
        : combine(timestamp({ format: 'HH:mm:ss' }), colorize(), devFormat),
    }),
  ],
});
