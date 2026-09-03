
// ------------------------------------------------
// monnifyAdapter.js
// Monnify provider adapter — STUB
// Full implementation added when Monnify
// access is confirmed and tested.
// ------------------------------------------------

const BaseAdapter = require('./baseAdapter');

class MonnifyAdapter extends BaseAdapter {
  constructor(provider) {
    super(provider);
  }

  async fetchAllServices() {
    return this.error('Monnify integration pending activation');
  }

  async fetchNetworks(service_type) {
    return this.error('Monnify integration pending activation');
  }

  async fetchDataPlans(service_id) {
    return this.error('Monnify integration pending activation');
  }

  async buyAirtime(params) {
    return this.error('Monnify integration pending activation');
  }

  async buyData(params) {
    return this.error('Monnify integration pending activation');
  }

  async verifyElectricity(params) {
    return this.error('Monnify integration pending activation');
  }

  async buyElectricity(params) {
    return this.error('Monnify integration pending activation');
  }

  async verifyTV(params) {
    return this.error('Monnify integration pending activation');
  }

  async buyTV(params) {
    return this.error('Monnify integration pending activation');
  }

  async buyExamCard(params) {
    return this.error('Monnify integration pending activation');
  }

  async checkTransactionStatus(params) {
    return this.error('Monnify integration pending activation');
  }
}

module.exports = MonnifyAdapter;
