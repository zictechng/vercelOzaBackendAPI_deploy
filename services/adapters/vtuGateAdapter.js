
// ------------------------------------------------
// vtuGateAdapter.js
// VTUGate provider adapter.
// Implements all BaseAdapter methods.
// Base URL: https://api.vtugate.com
// Auth: Bearer token
// Content-Type: application/x-www-form-urlencoded
// Rate limit: 60 requests per minute
// ------------------------------------------------

const axios = require('axios');
const BaseAdapter = require('./baseAdapter');

class VTUGateAdapter extends BaseAdapter {
  constructor(provider) {
    super(provider);
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  }

  // Build URL-encoded body
  form(data) {
    return new URLSearchParams(data).toString();
  }

  // -----------------------------------------------
  // Fetch all services from VTUGate
  // Returns all service types and their IDs
  // -----------------------------------------------
    async fetchAllServices() {
    try {
      // VTUGate requires fetching per service type
      const serviceTypes = ['airtime', 'data', 'electricity', 'tv', 'education'];
      const allServices = [];

      for (const service_type of serviceTypes) {
        try {
          const res = await this.client.post(
            '/api/v1/fetchservices',
            this.form({ service_type })
          );
          console.log(`VTUGate fetch ${service_type}:`, JSON.stringify(res.data).substring(0, 200));
          if (res.data?.status === true && res.data?.data) {
            const tagged = res.data.data.map((s) => ({
              ...s,
              _fetched_type: service_type,
            }));
            allServices.push(...tagged);
          }
        } catch (typeError) {
          console.log(`VTUGate fetch ${service_type} error:`, typeError.message);
          console.log(`VTUGate fetch ${service_type} response:`, typeError.response?.data);
        }
      }

      return this.success({ services: allServices });
    } catch (error) {
      return this.error(
        error.response?.data?.message || 'Failed to fetch services',
        error.response?.data
      );
    }
  }

  // -----------------------------------------------
  // Fetch networks for a service type
  // service_type: airtime|data|electricity|tv|education
  // -----------------------------------------------
  async fetchNetworks(service_type) {
    try {
      const res = await this.client.post(
        '/api/v1/fetchservices',
        this.form({ service_type })
      );
      return this.success({ networks: res.data?.data || [] });
    } catch (error) {
      return this.error(
        error.response?.data?.message || 'Failed to fetch networks',
        error.response?.data
      );
    }
  }

  // -----------------------------------------------
  // Fetch data plans for a service_id
  // -----------------------------------------------
  async fetchDataPlans(service_id) {
    try {
      const res = await this.client.post(
        '/api/v1/fetchdataplans',
        this.form({ service_id })
      );
      return this.success({ plans: res.data?.data || [] });
    } catch (error) {
      return this.error(
        error.response?.data?.message || 'Failed to fetch data plans',
        error.response?.data
      );
    }
  }

  // -----------------------------------------------
  // Buy airtime
  // -----------------------------------------------
  async buyAirtime({ service_id, phone_number, amount, reference }) {
    try {
      const res = await this.client.post(
        '/api/v1/buyairtime',
        this.form({ service_id, phone_number, amount, external_reference: reference })
      );
      if (res.data?.status !== true) {
        return this.error(res.data?.message || 'Airtime purchase failed', res.data);
      }
      return this.success({
        reference: res.data?.data?.external_reference || reference,
        transaction_id: res.data?.data?.transaction_id,
        network: res.data?.data?.network_name,
        data: res.data?.data,
      });
    } catch (error) {
      return this.error(
        error.response?.data?.message || 'Airtime purchase failed',
        error.response?.data
      );
    }
  }

  // -----------------------------------------------
  // Buy data
  // -----------------------------------------------
  async buyData({ service_id, phone_number, plan_code, amount, reference }) {
    try {
      const res = await this.client.post(
        '/api/v1/buydata',
        this.form({ service_id, phone_number, amount, plan_code, external_reference: reference })
      );
      if (res.data?.status !== true) {
        return this.error(res.data?.message || 'Data purchase failed', res.data);
      }
      return this.success({
        reference: res.data?.data?.external_reference || reference,
        transaction_id: res.data?.data?.transaction_id,
        data: res.data?.data,
      });
    } catch (error) {
      return this.error(
        error.response?.data?.message || 'Data purchase failed',
        error.response?.data
      );
    }
  }

  // -----------------------------------------------
  // Verify electricity meter
  // -----------------------------------------------
  async verifyElectricity({ service_id, meter_no, disco }) {
    try {
      const res = await this.client.post(
        '/api/v1/verifyelectricity',
        this.form({ service_id, meter_no, disco })
      );
      if (res.data?.status !== true) {
        return this.error(res.data?.message || 'Meter verification failed', res.data);
      }
      return this.success({
        customer_name: res.data?.data?.meter_name || '',
        address: res.data?.data?.cust_address || '',
        data: res.data?.data,
      });
    } catch (error) {
      return this.error(
        error.response?.data?.message || 'Meter verification failed',
        error.response?.data
      );
    }
  }

  // -----------------------------------------------
  // Buy electricity
  // -----------------------------------------------
  async buyElectricity({ service_id, meter_no, disco, amount, phone_number, reference }) {
    try {
      const res = await this.client.post(
        '/api/v1/buyelectricity',
        this.form({ service_id, meter_no, disco, amount, phone_number, external_reference: reference })
      );
      if (res.data?.status !== true) {
        return this.error(res.data?.message || 'Electricity purchase failed', res.data);
      }
      return this.success({
        token: res.data?.data?.token || '',
        units: res.data?.data?.units || '',
        reference: res.data?.data?.external_reference || reference,
        transaction_id: res.data?.data?.transaction_id,
        data: res.data?.data,
      });
    } catch (error) {
      return this.error(
        error.response?.data?.message || 'Electricity purchase failed',
        error.response?.data
      );
    }
  }

  // -----------------------------------------------
  // Verify TV smartcard
  // Returns customer name + available bouquets
  // -----------------------------------------------
  async verifyTV({ service_id, smartcard_number, phone }) {
    try {
      const res = await this.client.post(
        '/api/v1/verifycabletv',
        this.form({ service_id, smartcard_number, phone })
      );
      if (res.data?.status !== true) {
        return this.error(res.data?.message || 'Smartcard verification failed', res.data);
      }
      return this.success({
        customer_name: res.data?.data?.smartcard_name || '',
        bouquets: res.data?.data?.cable_plans || [],
        data: res.data?.data,
      });
    } catch (error) {
      return this.error(
        error.response?.data?.message || 'Smartcard verification failed',
        error.response?.data
      );
    }
  }

  // -----------------------------------------------
  // Buy TV subscription
  // -----------------------------------------------
  async buyTV({ service_id, smartcard_number, phone, amount, plan_code, plan_name, reference }) {
    try {
      const res = await this.client.post(
        '/api/v1/buycabletv',
        this.form({
          service_id,
          smartcard_number,
          phone,
          amount,
          plan_code,
          plan_name,
          external_reference: reference,
        })
      );
      if (res.data?.status !== true) {
        return this.error(res.data?.message || 'TV subscription failed', res.data);
      }
      return this.success({
        reference: res.data?.data?.external_reference || reference,
        transaction_id: res.data?.data?.transaction_id,
        plan_name: res.data?.data?.plan_name,
        data: res.data?.data,
      });
    } catch (error) {
      return this.error(
        error.response?.data?.message || 'TV subscription failed',
        error.response?.data
      );
    }
  }

  // -----------------------------------------------
  // Buy exam card
  // -----------------------------------------------
  async buyExamCard({ service_id, quantity, phone, email, reference }) {
    try {
      const res = await this.client.post(
        '/api/v1/buyeducation',
        this.form({ service_id, quantity, phone, email, external_reference: reference })
      );
      if (res.data?.status !== true) {
        return this.error(res.data?.message || 'Exam card purchase failed', res.data);
      }
      return this.success({
        pins: res.data?.data?.pins || [],
        reference: res.data?.data?.external_reference || reference,
        transaction_id: res.data?.data?.transaction_id,
        data: res.data?.data,
      });
    } catch (error) {
      return this.error(
        error.response?.data?.message || 'Exam card purchase failed',
        error.response?.data
      );
    }
  }

  // -----------------------------------------------
  // Check transaction status
  // -----------------------------------------------
  async checkTransactionStatus({ transaction_id, external_reference }) {
    try {
      const body = { requery: true };
      if (transaction_id) body.transaction_id = transaction_id;
      if (external_reference) body.external_reference = external_reference;

      const res = await this.client.post(
        '/api/v1/transactionstatus',
        this.form(body)
      );
      return this.success({ data: res.data?.data || {} });
    } catch (error) {
      return this.error(
        error.response?.data?.message || 'Status check failed',
        error.response?.data
      );
    }
  }
}

module.exports = VTUGateAdapter;

