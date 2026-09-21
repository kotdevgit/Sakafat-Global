// cPanel Phusion Passenger startup file
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
require('./server.js');
