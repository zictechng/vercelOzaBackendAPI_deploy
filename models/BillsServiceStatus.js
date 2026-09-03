
const mongoose = require('mongoose');


// BillsServiceStatus
// Controls visibility and availability of each
// bill service from the admin panel.
// status values:
//   active  — fully operational, shown to users
//   paused  — under maintenance, shown but disabled
//   hidden  — completely hidden from users


const billsServiceStatusSchema = new mongoose.Schema(
  {
    airtime: {
      type: String,
      enum: ['active', 'paused', 'hidden'],
      default: 'active',
    },
    electricity: {
      type: String,
      enum: ['active', 'paused', 'hidden'],
      default: 'active',
    },
    mobile_data: {
      type: String,
      enum: ['active', 'paused', 'hidden'],
      default: 'active',
    },
    tv_subscription: {
      type: String,
      enum: ['active', 'paused', 'hidden'],
      default: 'active',
    },
    exam_cards: {
      type: String,
      enum: ['active', 'paused', 'hidden'],
      default: 'active',
    },
    last_updated_by: {
      type: String,
      default: 'system',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BillsServiceStatus', billsServiceStatusSchema);