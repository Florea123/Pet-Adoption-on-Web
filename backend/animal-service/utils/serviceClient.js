const http = require('http');
const https = require('https');
const serviceDiscovery = require('../../serviceDiscovery');

class ServiceClient {
  constructor() {
    // Token cache for service-to-service auth
    this.serviceTokens = {};
  }
  
  /**
   * Make HTTP request to another service
   */
  request(serviceName, path, options = {}) {
    return new Promise((resolve, reject) => {
      const serviceUrl = serviceDiscovery.getServiceUrl(serviceName);
      if (!serviceUrl) {
        return reject(new Error(`Service not found: ${serviceName}`));
      }
      
      const serviceBaseUrl = new URL(serviceUrl);
      const requestUrl = new URL(path, serviceUrl);
      
      const requestOptions = {
        hostname: requestUrl.hostname,
        port: requestUrl.port,
        path: requestUrl.pathname + requestUrl.search,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      };
      
      // Add service auth token if available
      if (this.serviceTokens[serviceName]) {
        requestOptions.headers['Authorization'] = `Bearer ${this.serviceTokens[serviceName]}`;
      }
      
      const httpModule = requestUrl.protocol === 'https:' ? https : http;
      const req = httpModule.request(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsedData = data ? JSON.parse(data) : null;
              resolve({ status: res.statusCode, data: parsedData });
            } catch (e) {
              reject(new Error(`Invalid JSON response: ${e.message}`));
            }
          } else {
            reject(new Error(`Request failed with status ${res.statusCode}: ${data}`));
          }
        });
      });
      
      // Handle request errors
      req.on('error', (err) => {
        reject(new Error(`Service request failed: ${err.message}`));
      });
      
      // Set timeout
      req.setTimeout(10000, () => {
        req.abort();
        reject(new Error(`Request to ${serviceName} timed out`));
      });
      
      // Send request body for methods that need it
      if (['POST', 'PUT', 'PATCH'].includes(options.method) && options.body) {
        const body = JSON.stringify(options.body);
        req.write(body);
      }
      
      req.end();
    });
  }
  
  // Helper methods for common requests
  async get(serviceName, path, headers = {}) {
    return this.request(serviceName, path, { method: 'GET', headers });
  }
  
  async post(serviceName, path, body, headers = {}) {
    return this.request(serviceName, path, { method: 'POST', body, headers });
  }
  
  async put(serviceName, path, body, headers = {}) {
    return this.request(serviceName, path, { method: 'PUT', body, headers });
  }
  
  async delete(serviceName, path, headers = {}) {
    return this.request(serviceName, path, { method: 'DELETE', headers });
  }
  
  // Example: Get user data from the user service
  async getUserData(userId) {
    try {
      const response = await this.get('user', `/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to get user data for ID ${userId}:`, error);
      return null;
    }
  }
  
  // Example: Get media items for an animal
  async getAnimalMedia(animalId) {
    try {
      const response = await this.get('media', `/media/animal/${animalId}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to get media for animal ID ${animalId}:`, error);
      return [];
    }
  }
}

module.exports = new ServiceClient();