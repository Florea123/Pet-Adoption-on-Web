const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Define services with their paths and ports
const services = [
  { name: 'user-service', path: 'user-service', port: 3000 },
  { name: 'animal-service', path: 'animal-service', port: 3001 },
  { name: 'multimedia-service', path: 'multimedia-service', port: 3002 },
  { name: 'messages-service', path: 'messages-service', port: 3003 },
  { name: 'newsletter-service', path: 'newsletter-service', port: 3004 }
];

// Store running processes
const runningProcesses = {};

// Helper to create directory for logs 
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Start a specific service
function startService(service) {
  if (runningProcesses[service.name]) {
    console.log(`${service.name} is already running on port ${service.port}`);
    return;
  }

  console.log(`Starting ${service.name} on port ${service.port}...`);
  
  // Create log streams
  const outLog = fs.createWriteStream(path.join(logsDir, `${service.name}.out.log`), { flags: 'a' });
  const errLog = fs.createWriteStream(path.join(logsDir, `${service.name}.err.log`), { flags: 'a' });
  
  // Spawn the node process - renamed 'process' to 'proc' to avoid conflicts
  const proc = spawn('node', ['server.js'], {
    cwd: path.join(__dirname, service.path),
    env: { ...process.env, PORT: service.port },
    stdio: 'pipe'
  });
  
  // Store the process reference
  runningProcesses[service.name] = {
    process: proc,
    port: service.port,
    outLog,
    errLog
  };

  // Handle output
  proc.stdout.pipe(outLog);
  proc.stderr.pipe(errLog);
  
  // Log output with service prefix
  proc.stdout.on('data', (data) => {
    console.log(`[${service.name}] ${data.toString().trim()}`);
  });
  
  proc.stderr.on('data', (data) => {
    console.error(`[${service.name}] ERROR: ${data.toString().trim()}`);
  });
  
  // Handle process exit
  proc.on('close', (code) => {
    console.log(`${service.name} exited with code ${code}`);
    
    // Clean up resources
    outLog.end();
    errLog.end();
    delete runningProcesses[service.name];
  });
}

// Stop a specific service
function stopService(service) {
  const runningService = runningProcesses[service.name];
  if (!runningService) {
    console.log(`${service.name} is not running`);
    return;
  }

  console.log(`Stopping ${service.name}...`);
  
  // Send SIGTERM signal to gracefully terminate
  runningService.process.kill('SIGTERM');
  
  setTimeout(() => {
    if (runningProcesses[service.name]) {
      console.log(`Force killing ${service.name}...`);
      runningService.process.kill('SIGKILL');
    }
  }, 5000);
}

// Start all services
function startAllServices() {
  console.log('Starting all services...');
  services.forEach(service => startService(service));
}

// Stop all services
function stopAllServices() {
  console.log('Stopping all services...');
  Object.keys(runningProcesses).forEach(name => {
    const service = services.find(s => s.name === name);
    if (service) {
      stopService(service);
    }
  });
}

// Display status of all services
function showStatus() {
  console.log('\n=== Services Status ===');
  services.forEach(service => {
    const isRunning = runningProcesses[service.name] ? 'RUNNING' : 'STOPPED';
    const port = runningProcesses[service.name] ? runningProcesses[service.name].port : service.port;
    console.log(`${service.name.padEnd(20)} [${isRunning}] Port: ${port}`);
  });
  console.log('======================\n');
}

function startCLI() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'pet-adoption> '
  });

  console.log('\n=== Pet Adoption Microservices Launcher ===');
  console.log('Available commands:');
  console.log('  start all            - Start all services');
  console.log('  start [service-name] - Start a specific service');
  console.log('  stop all             - Stop all services');
  console.log('  stop [service-name]  - Stop a specific service');
  console.log('  status               - Show status of all services');
  console.log('  help                 - Show this help message');
  console.log('  exit                 - Exit the launcher\n');
  
  rl.prompt();

  rl.on('line', (line) => {
    const cmd = line.trim().split(' ');
    
    switch(cmd[0]) {
      case 'start':
        if (cmd[1] === 'all') {
          startAllServices();
        } else {
          const service = services.find(s => s.name === cmd[1]);
          if (service) {
            startService(service);
          } else {
            console.log(`Unknown service: ${cmd[1]}`);
            console.log('Available services:', services.map(s => s.name).join(', '));
          }
        }
        break;
      
      case 'stop':
        if (cmd[1] === 'all') {
          stopAllServices();
        } else {
          const service = services.find(s => s.name === cmd[1]);
          if (service) {
            stopService(service);
          } else {
            console.log(`Unknown service: ${cmd[1]}`);
            console.log('Available services:', services.map(s => s.name).join(', '));
          }
        }
        break;
      
      case 'status':
        showStatus();
        break;
      
      case 'help':
        console.log('\nAvailable commands:');
        console.log('  start all            - Start all services');
        console.log('  start [service-name] - Start a specific service');
        console.log('  stop all             - Stop all services');
        console.log('  stop [service-name]  - Stop a specific service');
        console.log('  status               - Show status of all services');
        console.log('  help                 - Show this help message');
        console.log('  exit                 - Exit the launcher\n');
        break;
      
      case 'exit':
        console.log('Stopping all services and exiting...');
        stopAllServices();
        setTimeout(() => {
          rl.close();
          process.exit(0);
        }, 1000);
        return;
      
      default:
        console.log(`Unknown command: ${cmd[0]}`);
        console.log('Type "help" for available commands');
    }
    
    rl.prompt();
  }).on('close', () => {
    console.log('Exiting launcher...');
    stopAllServices();
    process.exit(0);
  });
}

process.on('SIGINT', () => {
  console.log('\nReceived SIGINT. Shutting down gracefully...');
  stopAllServices();
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

startCLI();