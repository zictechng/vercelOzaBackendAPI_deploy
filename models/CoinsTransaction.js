
const mongoose = require('mongoose');

// -------------------------------------------------
// CoinsTransaction
// Records every coin credit/debit for a user.
// source_type tracks how coins were earned.
// -------------------------------------------------

const coinsTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tag_id: {
      type: String,
      required: true,
    },
    coins: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ['credit', 'debit'],
      required: true,
    },
    source_type: {
      type: String,
      enum: [
        'bills_payment',
        'buy_sell',
        'referral',
        'business_promoter',
        'admin_credit',
        'redemption',
      ],
      required: true,
    },
    source_reference: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    coins_balance_before: {
      type: Number,
      required: true,
    },
    coins_balance_after: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

coinsTransactionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('CoinsTransaction', coinsTransactionSchema);