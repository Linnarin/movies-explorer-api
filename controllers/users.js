const { NODE_ENV, JWT_SECRET } = process.env;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

const BadRequestError = require('../errors/BadRequestError');

const ConflictError = require('../errors/ConflictError');

const UnauthorizedError = require('../errors/UnauthorizedError');

const NotFoundError = require('../errors/NotFoundError');

const tokenString = NODE_ENV === 'production' ? JWT_SECRET : 'dev-secret';

const createUser = (req, res, next) => {
  const {
    email, password, name,
  } = req.body;

  bcrypt.hash(password, 10)
    .then((hash) => User.create({
      email, password: hash, name,
    }))
    .then((document) => {
      const user = document.toObject();
      delete user.password;
      res.send({ data: user });
    })
    .catch((err) => {
      if (err.name === 'ValidationError') {
        next(
          new BadRequestError('Переданы некорректные данные при запросе пользователя.'),
        );
      } else if (err.code === 11000) {
        next(
          new ConflictError('Пользователь с таким email уже существует'),
        );
      } else {
        next(err);
      }
    });
};

const login = (req, res, next) => {
  const { email, password } = req.body;
  let userId;

  User.findOne({ email }).select('+password')
    .then((user) => {
      if (!user) {
        return next(
          new UnauthorizedError('Неверные почта или пароль.'),
        );
      }

      userId = user._id;
      return bcrypt.compare(password, user.password);
    })
    .then((matched) => {
      if (!matched) {
        return next(
          new UnauthorizedError('Неверные почта или пароль'),
        );
      }

      const token = jwt.sign({ _id: userId }, tokenString, { expiresIn: '7d' });
      return res.send({ token });
    })
    .catch((err) => {
      next(err);
    });
};

const getUser = (req, res, next) => {
  User.findById(req.user._id)
    .then((user) => {
      if (user === null) {
        next(
          new NotFoundError('Пользователь не найден'),
        );
      } else {
        res.send({ data: user });
      }
    })
    .catch((err) => {
      if (err.name === 'CastError') {
        next(
          new BadRequestError('Переданы некорректные данные при запросе пользователя'),
        );
      } else {
        next(err);
      }
    });
};

const updateUser = (req, res, next) => {
  const { name, email } = req.body;

  User.findByIdAndUpdate(req.user._id, { name, email }, {
    new: true,
    runValidators: true,
  })
    .then((user) => {
      if (user === null) {
        next(
          new NotFoundError('Пользователь не найден'),
        );
      } else {
        res.send({ data: user });
      }
    })
    .catch((err) => {
      if (err.name === 'ValidationError') {
        next(
          new BadRequestError('Переданы некорректные данные при обновлении пользователя.'),
        );
      } else if (err.code === 11000) {
        next(
          new ConflictError('Пользователь с таким email уже существует'),
        );
      } else {
        next(err);
      }
    });
};

module.exports = {
  createUser,
  getUser,
  updateUser,
  login,
};
