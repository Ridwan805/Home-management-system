const login = require('./login.controller');
const register = require('./register.controller');
const wishlist = require('./wishlist.controller');
const property = require('./property.controller');
const building = require('./building.controller');
const rent = require('./rent.controller');
const ownershipTransfer = require('./ownershipTransfer.controller');
const invoice = require('./invoice.controller');
const request = require('./request.controller');
const requestManagement = require('./requestManagement.controller');
const admin = require('./admin.controller');
const getMe = require('./getMe.controller');
const updateUser = require('./updateUser.controller');
const forgotPassword = require('./forgotPassword.controller');
const notifications = require('./notifications.controller');
const stripe = require('./stripe.controller');

module.exports = {
    login,
    register,
    wishlist,
    property,
    building,
    rent,
    ownershipTransfer,
    invoice,
    request,
    requestManagement,
    admin,
    getMe,
    updateUser,
    forgotPassword,
    notifications,
    stripe
};