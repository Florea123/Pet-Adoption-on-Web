const os = require('os');
const http = require('http');
const oracledb = require('oracledb');

class HealthCheck {
  constructor(serviceName) {
    this.serviceName = serviceName;
    this.checks = {};
    this.status = 'UP';
    this.startTime = new Date();
  }
  
  // Add a health check function
  addCheck(name, checkFn) {
    this.checks[name] = {
      check: checkFn,
      status: 'UNKNOWN',
      lastCheck: null,
      lastError: null
    };
  }
  
  // Run all health checks
  async runChecks() {
    const results = {};
    let overallStatus = 'UP';
    
    for (const [name, check] of Object.entries(this.checks)) {
      try {
        const startTime = Date.now();
        await check.check();
        const duration = Date.now() - startTime;
        
        results[name] = {
          status: 'UP',
          responseTime: `${duration}ms`,
          lastChecked: new Date().toISOString()
        };
        
        check.status = 'UP';
        check.lastCheck = new Date();
      } catch (error) {
        console.error(`Health check '${name}' failed:`, error);
        
        results[name] = {
          status: 'DOWN',
          error: error.message,
          lastChecked: new Date().toISOString()
        };
        
        check.status = 'DOWN';
        check.lastCheck = new Date();
        check.lastError = error;
        
        overallStatus = 'DOWN';
      }
    }
    
    this.status = overallStatus;
    
    return {
      service: this.serviceName,
      status: overallStatus,
      uptime: `${Math.floor((new Date() - this.startTime) / 1000 / 60)} minutes`,
      timestamp: new Date().toISOString(),
      hostname: os.hostname(),
      memory: {
        total: `${Math.round(os.totalmem() / 1024 / 1024)} MB`,
        free: `${Math.round(os.freemem() / 1024 / 1024)} MB`,
        used: `${Math.round((os.totalmem() - os.freemem()) / 1024 / 1024)} MB`
      },
      checks: results
    };
  }
  
  // Add database check
  addDatabaseCheck() {
    this.addCheck('database', async () => {
      const connection = await oracledb.getConnection();
      try {
        await connection.execute('SELECT 1 FROM DUAL');
      } finally {
        await connection.close();
      }
    });
  }
  
  // Add external service dependency check
  addDependencyCheck(name, url) {
    this.addCheck(`dependency-${name}`, () => {
      return new Promise((resolve, reject) => {
        const parsedUrl = new URL('/health', url);
        const req = http.request({
          hostname: parsedUrl.hostname,
          port: parsedUrl.port,
          path: parsedUrl.pathname,
          method: 'GET',
          timeout: 5000
        }, (res) => {
          if (res.statusCode === 200) {
            resolve();
          } else {
            reject(new Error(`Service '${name}' returned status ${res.statusCode}`));
          }
        });
        
        req.on('error', reject);
        req.on('timeout', () => {
          req.abort();
          reject(new Error(`Health check for '${name}' timed out`));
        });
        req.end();
      });
    });
  }
  
  // Add memory usage check
  addMemoryCheck(thresholdMb = 500) {
    this.addCheck('memory', () => {
      return new Promise((resolve, reject) => {
        const memUsage = process.memoryUsage();
        const heapUsedMb = Math.round(memUsage.heapUsed / 1024 / 1024);
        
        if (heapUsedMb < thresholdMb) {
          resolve();
        } else {
          reject(new Error(`Memory usage too high: ${heapUsedMb}MB exceeds threshold of ${thresholdMb}MB`));
        }
      });
    });
  }
  
  // HTTP handler for health endpoint
  async handleHealthRequest(req, res) {
    try {
      const result = await this.runChecks();
      const statusCode = result.status === 'UP' ? 200 : 503;
      
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result, null, 2));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Health check system error', message: error.message }));
    }
  }
}

module.exports = HealthCheck;