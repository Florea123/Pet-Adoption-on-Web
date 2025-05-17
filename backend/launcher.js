const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Define all microservices
const services = [
  {
    name: 'Gateway',
    path: path.join(__dirname, 'server.js'),
    port: process.env.GATEWAY_PORT || 3000,
    process: null,
    status: 'stopped',
    logs: []
  },
  {
    name: 'User Service',
    path: path.join(__dirname, 'user-service', 'server.js'),
    port: process.env.USER_SERVICE_PORT || 3001,
    process: null,
    status: 'stopped',
    logs: []
  },
  {
    name: 'Animal Service',
    path: path.join(__dirname, 'animal-service', 'server.js'),
    port: process.env.ANIMAL_SERVICE_PORT || 3002,
    process: null,
    status: 'stopped',
    logs: []
  },
  {
    name: 'Message Service',
    path: path.join(__dirname, 'messages-service', 'server.js'),
    port: process.env.MESSAGE_SERVICE_PORT || 3003,
    process: null,
    status: 'stopped',
    logs: []
  },
  {
    name: 'Multimedia Service',
    path: path.join(__dirname, 'multimedia-service', 'server.js'),
    port: process.env.MULTIMEDIA_SERVICE_PORT || 3004,
    process: null,
    status: 'stopped',
    logs: []
  },
  {
    name: 'Newsletter Service',
    path: path.join(__dirname, 'newsletter-service', 'server.js'),
    port: process.env.NEWSLETTER_SERVICE_PORT || 3005,
    process: null,
    status: 'stopped',
    logs: []
  }
];

// Create logs directory
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Start a single service
function startService(service) {
  if (service.status === 'running') {
    console.log(`[${service.name}] Already running on port ${service.port}`);
    return;
  }

  // Check if service file exists
  if (!fs.existsSync(service.path)) {
    console.error(`[${service.name}] Error: Service file not found at ${service.path}`);
    service.status = 'error';
    return;
  }

  console.log(`[${service.name}] Starting on port ${service.port}...`);

  // Create log stream
  const logFile = fs.createWriteStream(
    path.join(logsDir, `${service.name.toLowerCase().replace(/\s+/g, '-')}.log`),
    { flags: 'a' }
  );

  // Spawn process
  const childProcess = spawn('node', [service.path], {
    env: {
      ...process.env,
      PORT: service.port
    }
  });

  // Handle output
  childProcess.stdout.on('data', (data) => {
    const message = `[${new Date().toISOString()}] ${data.toString().trim()}`;
    logFile.write(message + '\n');
    service.logs.push(message);
    if (service.logs.length > 1000) service.logs.shift(); // Keep last 1000 logs
    console.log(`[${service.name}]`, data.toString().trim());
  });

  childProcess.stderr.on('data', (data) => {
    const message = `[${new Date().toISOString()}] ERROR: ${data.toString().trim()}`;
    logFile.write(message + '\n');
    service.logs.push(message);
    console.error(`[${service.name}] ERROR:`, data.toString().trim());
  });

  // Handle process exit
  childProcess.on('close', (code) => {
    const message = `[${new Date().toISOString()}] Process exited with code ${code}`;
    logFile.write(message + '\n');
    service.logs.push(message);
    console.log(`[${service.name}] Process exited with code ${code}`);
    
    service.status = 'stopped';
    service.process = null;
    
    // Attempt to restart service on crash
    if (code !== 0 && !shuttingDown) {
      console.log(`[${service.name}] Restarting service in 5 seconds...`);
      setTimeout(() => {
        startService(service);
      }, 5000);
    }
  });

  service.process = childProcess;
  service.status = 'running';
}

// Stop a single service
function stopService(service) {
  if (!service.process) {
    console.log(`[${service.name}] Not running`);
    service.status = 'stopped';
    return;
  }

  console.log(`[${service.name}] Stopping...`);
  
  // Send SIGTERM signal
  service.process.kill('SIGTERM');
  
  // Force kill after timeout
  setTimeout(() => {
    if (service.process) {
      console.log(`[${service.name}] Force killing...`);
      service.process.kill('SIGKILL');
      service.process = null;
      service.status = 'stopped';
    }
  }, 5000);
}

// Start all services
function startAllServices() {
  console.log("Starting all Pet Adoption microservices");
  
  // Start in order - some services might depend on others
  for (const service of services) {
    startService(service);
    // Small delay to prevent race conditions
    setTimeout(() => {}, 1000);
  }
}

// Stop all services
let shuttingDown = false;
function stopAllServices() {
  shuttingDown = true;
  console.log("Shutting down all services...");
  
  // Reverse order for shutdown (gateway last)
  const reversedServices = [...services].reverse();
  for (const service of reversedServices) {
    stopService(service);
  }
}

// Check service status
function statusCheck() {
  console.log("\nService Status:");
  console.log("==============");
  
  for (const service of services) {
    console.log(`${service.name}: ${service.status.toUpperCase()} ${service.status === 'running' ? `(PID: ${service.process.pid})` : ''}`);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log("\nReceived SIGINT. Graceful shutdown...");
  stopAllServices();
  
  // Exit after giving services time to shut down
  setTimeout(() => {
    console.log("Exiting process");
    process.exit(0);
  }, 6000);
});

process.on('SIGTERM', () => {
  console.log("\nReceived SIGTERM. Graceful shutdown...");
  stopAllServices();
  
  // Exit after giving services time to shut down
  setTimeout(() => {
    console.log("Exiting process");
    process.exit(0);
  }, 6000);
});

// Basic CLI for process management
function setupCLI() {
  process.stdout.write('\nPet Adoption Microservices Manager\n');
  process.stdout.write('Type "help" for available commands\n');
  process.stdout.write('> ');

  process.stdin.on('data', (data) => {
    const input = data.toString().trim();
    
    switch (input) {
      case 'start':
        startAllServices();
        break;
      case 'stop':
        stopAllServices();
        break;
      case 'restart':
        stopAllServices();
        setTimeout(() => {
          startAllServices();
        }, 6000);
        break;
      case 'status':
        statusCheck();
        break;
      case 'help':
        console.log('\nAvailable commands:');
        console.log('  start    - Start all services');
        console.log('  stop     - Stop all services');
        console.log('  restart  - Restart all services');
        console.log('  status   - Check service status');
        console.log('  exit     - Exit the manager (stops all services)');
        console.log('  help     - Show this help message');
        break;
      case 'exit':
        stopAllServices();
        console.log('Exiting...');
        setTimeout(() => process.exit(0), 6000);
        return;
      default:
        console.log(`Unknown command: ${input}`);
    }
    
    process.stdout.write('> ');
  });
}

// Start the manager
console.log("Pet Adoption Microservices Manager");
console.log("==================================");
setupCLI();

// Auto-start if requested
if (process.argv.includes('--autostart')) {
  startAllServices();
}