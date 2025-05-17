const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');

class ServiceDiscovery {
  constructor() {
    this.services = {
      user: process.env.USER_SERVICE_URL || 'http://localhost:3001',
      animal: process.env.ANIMAL_SERVICE_URL || 'http://localhost:3002',
      message: process.env.MESSAGE_SERVICE_URL || 'http://localhost:3003',
      media: process.env.MULTIMEDIA_SERVICE_URL || 'http://localhost:3004',
      newsletter: process.env.NEWSLETTER_SERVICE_URL || 'http://localhost:3005'
    };
    
    this.configPath = path.join(__dirname, 'service-registry.json');
    this.loadConfig();
    
    // Health status of services
    this.serviceHealth = {};
    
    // Watch for config changes
    fs.watchFile(this.configPath, () => {
      console.log('Service registry file changed, reloading...');
      this.loadConfig();
    });
    
    // Start health check polling
    this.startHealthChecks();
  }
  
  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        this.services = { ...this.services, ...config };
        console.log('Service registry loaded from file');
      }
    } catch (error) {
      console.error('Error loading service registry:', error);
    }
  }
  
  saveConfig() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.services, null, 2));
    } catch (error) {
      console.error('Error saving service registry:', error);
    }
  }
  
  getServiceUrl(serviceName) {
    return this.services[serviceName];
  }
  
  getServiceForPath(path) {
    if (path.startsWith('/users')) return this.getServiceUrl('user');
    if (path.startsWith('/animals')) return this.getServiceUrl('animal');
    if (path.startsWith('/messages')) return this.getServiceUrl('message');
    if (path.startsWith('/media')) return this.getServiceUrl('media');
    if (path.startsWith('/newsletter')) return this.getServiceUrl('newsletter');
    return null;
  }
  
  registerService(name, url) {
    this.services[name] = url;
    this.saveConfig();
    console.log(`Registered service: ${name} at ${url}`);
  }
  
  // Perform health checks on services
  startHealthChecks() {
    setInterval(() => {
      Object.entries(this.services).forEach(([name, url]) => {
        this.checkServiceHealth(name, url);
      });
    }, 30000); // Check every 30 seconds
  }
  
  checkServiceHealth(name, url) {
    const parsedUrl = new URL('/health', url);
    
    const req = http.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      method: 'GET',
      timeout: 5000 // 5 second timeout
    }, (res) => {
      let data = '';
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          this.serviceHealth[name] = {
            status: 'UP',
            lastChecked: new Date(),
            details: data ? JSON.parse(data) : null
          };
          console.log(`Service ${name} is healthy`);
        } else {
          this.serviceHealth[name] = {
            status: 'WARNING',
            statusCode: res.statusCode,
            lastChecked: new Date()
          };
          console.warn(`Service ${name} health check returned ${res.statusCode}`);
        }
      });
    });

    req.on('error', (err) => {
      this.serviceHealth[name] = {
        status: 'DOWN',
        lastChecked: new Date(),
        error: err.message
      };
      console.error(`Service ${name} health check failed: ${err.message}`);
    });
    
    req.on('timeout', () => {
      req.abort();
      this.serviceHealth[name] = {
        status: 'DOWN',
        lastChecked: new Date(),
        error: 'Health check timed out'
      };
      console.error(`Service ${name} health check timed out`);
    });

    req.end();
  }
  
  // Get the status of all services
  getHealthStatus() {
    return {
      services: this.serviceHealth,
      timestamp: new Date().toISOString(),
      hostname: os.hostname()
    };
  }
}

// Singleton instance
const serviceDiscovery = new ServiceDiscovery();

module.exports = serviceDiscovery;