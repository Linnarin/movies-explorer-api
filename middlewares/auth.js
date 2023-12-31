const { NODE_ENV, JWT_SECRET } = process.env;
const jwt = require('jsonwebtoken');

const UnauthorizedError = require('../errors/UnauthorizedError');

const tokenString = NODE_ENV === 'production' ? JWT_SECRET : 'dev-secret';

module.exports = (req, res, next) => {
  const { authorization } = req.headers;

  if (!authorization || !authorization.startsWith('Bearer ')) {
    throw new UnauthorizedError('Необходима авторизация.');
  }

  const token = authorization.replace('Bearer ', '');

  let payload;

  try {
    payload = jwt.verify(token, tokenString);
  } catch (err) {
    throw new UnauthorizedError('Необходима авторизация.');
  }

  req.user = payload;

  return next();
};
