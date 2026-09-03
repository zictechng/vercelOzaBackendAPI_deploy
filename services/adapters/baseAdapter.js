
// ------------------------------------------------
// baseAdapter.js
// Base interface all provider adapters must follow.
// Every adapter MUST implement these methods.
// Throwing NotImplementedError forces compliance.
// ------------------------------------------------

class BaseAdapter {
  constructor(provider) {
    this.provider = provider;
    this.apiKey = provider.api_key_decrypted;
    this.baseUrl = provider.base_url;
    this.slug = provider.slug;
  }

  // Fetch all services and their IDs from provider
  async fetchAllServices() {
    throw new Error(`fetchAllServices not implemented for ${this.slug}`);
  }

  // Fetch networks for a specific service type
  async fetchNetworks(service_type) {
    throw new Error(`fetchNetworks not implemented for ${this.slug}`);
  }

  // Fetch data plans for a network
  async fetchDataPlans(service_id) {
    throw new Error(`fetchDataPlans not implemented for ${this.slug}`);
  }

  // Buy airtime
  async buyAirtime({ service_id, phone_number, amount, reference }) {
    throw new Error(`buyAirtime not implemented for ${this.slug}`);
  }

  // Buy data
  async buyData({ service_id, phone_number, plan_code, amount, reference }) {
    throw new Error(`buyData not implemented for ${this.slug}`);
  }

  // Verify electricity meter
  async verifyElectricity({ service_id, meter_no, disco }) {
    throw new Error(`verifyElectricity not implemented for ${this.slug}`);
  }

  // Buy electricity
  async buyElectricity({ service_id, meter_no, disco, amount, phone_number, reference }) {
    throw new Error(`buyElectricity not implemented for ${this.slug}`);
  }

  // Verify TV smartcard — also returns bouquets
  async verifyTV({ service_id, smartcard_number, phone }) {
    throw new Error(`verifyTV not implemented for ${this.slug}`);
  }

  // Buy TV subscription
  async buyTV({ service_id, smartcard_number, phone, amount, plan_code, plan_name, reference }) {
    throw new Error(`buyTV not implemented for ${this.slug}`);
  }

  // Buy exam card
  async buyExamCard({ service_id, quantity, phone, email, reference }) {
    throw new Error(`buyExamCard not implemented for ${this.slug}`);
  }

  // Check transaction status
  async checkTransactionStatus({ transaction_id, external_reference }) {
    throw new Error(`checkTransactionStatus not implemented for ${this.slug}`);
  }

  // Standard success response shape
  // All adapters must return this format
  success(data = {}) {
    return { success: true, ...data };
  }

  // Standard error response shape
  error(message, raw = {}) {
    return { success: false, message, raw };
  }
}

module.exports = BaseAdapter;
