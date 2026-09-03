
// ------------------------------------------------
// bigisubAdapter.js
// Bigisub provider adapter — STUB
// Implements BaseAdapter interface.
// Full implementation added when Bigisub
// KYC is approved and API access granted.
// ------------------------------------------------

const BaseAdapter = require('./baseAdapter');

class BigisubAdapter extends BaseAdapter {
  constructor(provider) {
    super(provider);
  }

  async fetchAllServices() {
    return this.error('Bigisub integration pending KYC approval');
  }

  async fetchNetworks(service_type) {
    return this.error('Bigisub integration pending KYC approval');
  }

  async fetchDataPlans(service_id) {
    return this.error('Bigisub integration pending KYC approval');
  }

  async buyAirtime(params) {
    return this.error('Bigisub integration pending KYC approval');
  }

  async buyData(params) {
    return this.error('Bigisub integration pending KYC approval');
  }

  async verifyElectricity(params) {
    return this.error('Bigisub integration pending KYC approval');
  }

  async buyElectricity(params) {
    return this.error('Bigisub integration pending KYC approval');
  }

  async verifyTV(params) {
    return this.error('Bigisub integration pending KYC approval');
  }

  async buyTV(params) {
    return this.error('Bigisub integration pending KYC approval');
  }

  async buyExamCard(params) {
    return this.error('Bigisub integration pending KYC approval');
  }

  async checkTransactionStatus(params) {
    return this.error('Bigisub integration pending KYC approval');
  }
}

module.exports = BigisubAdapter;
