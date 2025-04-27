class ActivityChart {
    constructor(containerId, title, color, data) {
        this.container = document.getElementById(containerId);
        this.title = title;
        this.color = color;
        this.data = data; // Should be in format [{date: 'YYYY-MM-DD', count: n}, ...]
        
        // Set minimum maxValue to 5 to ensure we have some height even with small numbers
        // Find the actual max value from data
        const dataMax = Math.max(...this.data.map(item => item.count), 0);
        
        // Round up to a nice number for y-axis display
        this.maxValue = Math.max(5, this.roundUpToNiceNumber(dataMax));
        
        this.render();
    }

    // Helper to round up to nice numbers for y-axis
    roundUpToNiceNumber(num) {
        if (num <= 5) return 5;
        if (num <= 10) return 10;
        
        // Round up to the next multiple of 5 or 10 depending on size
        const magnitude = Math.pow(10, Math.floor(Math.log10(num)));
        const normalized = num / magnitude;
        
        if (normalized <= 5) {
            return Math.ceil(normalized) * magnitude;
        } else {
            return Math.ceil(normalized / 5) * 5 * magnitude;
        }
    }

    static formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    }

    render() {
        if (!this.container) {
            console.error(`Container with ID ${this.containerId} not found`);
            return;
        }

        // Clear any existing content
        this.container.innerHTML = '';

        // Create chart wrapper
        const chartWrapper = document.createElement('div');
        chartWrapper.className = 'chart-wrapper';

        // Create header
        const header = document.createElement('div');
        header.className = 'chart-header';
        header.innerHTML = `
            <h3 class="chart-title">${this.title}</h3>
            <div class="chart-legend">
                <span class="legend-label">Last 7 days</span>
            </div>
        `;

        // Create chart container
        const chartContainer = document.createElement('div');
        chartContainer.className = 'chart-container';

        // Create Y-axis labels
        const yAxis = document.createElement('div');
        yAxis.className = 'chart-y-axis';
        
        // Calculate y-axis ticks dynamically - ensure we have 6 evenly spaced ticks including 0
        const numTicks = 6;
        const yTicks = [];
        const tickInterval = this.maxValue / (numTicks - 1);
        
        for (let i = 0; i < numTicks; i++) {
            yTicks.push(Math.round(i * tickInterval));
        }
        
        // Ensure the last tick is the max value
        yTicks[yTicks.length - 1] = this.maxValue;
        
        // Create Y axis labels (reversed order to show highest at top)
        yTicks.reverse().forEach((value, index) => {
            const label = document.createElement('div');
            label.className = 'y-label';
            label.textContent = value;
            label.style.top = `${(index * (100 / (numTicks - 1)))}%`;
            label.style.transform = 'translateY(-50%)';
            yAxis.appendChild(label);
        });

        // Create chart visualization area
        const chartVis = document.createElement('div');
        chartVis.className = 'chart-visualization';
        
        // Create bars container
        const barsContainer = document.createElement('div');
        barsContainer.className = 'chart-bars';
        
        // Add grid lines for better readability
        const gridLines = document.createElement('div');
        gridLines.className = 'grid-lines';
        
        // Add grid lines at each tick position
        yTicks.forEach((_, index) => {
            const line = document.createElement('div');
            line.className = 'grid-line';
            line.style.top = `${(index * (100 / (numTicks - 1)))}%`;
            gridLines.appendChild(line);
        });
        
        chartVis.appendChild(gridLines);

        // Create x-axis container
        const xAxis = document.createElement('div');
        xAxis.className = 'chart-x-axis';

        // Create and add each bar
        this.data.forEach(item => {
            const barWrapper = document.createElement('div');
            barWrapper.className = 'bar-wrapper';
            
            // Calculate bar height as percentage (minimum 1% for visibility if not zero)
            const percentage = this.maxValue > 0 
                ? (item.count / this.maxValue * 100)
                : 0;
            
            const barHeight = item.count > 0 ? Math.max(1, percentage) : 0;
            
            // Create bar container to position the bar at the bottom
            const barContainer = document.createElement('div');
            barContainer.className = 'bar-container';
            
            const bar = document.createElement('div');
            bar.className = 'chart-bar';
            bar.style.height = `${barHeight}%`;
            bar.style.backgroundColor = this.color;
            
            // Add count at the top of the bar for non-zero values
            if (item.count > 0) {
                const countLabel = document.createElement('div');
                countLabel.className = 'bar-count';
                countLabel.textContent = item.count;
                barContainer.appendChild(countLabel);
            }
            
            // Add tooltip with date and value
            bar.setAttribute('data-tooltip', `${item.count} on ${ActivityChart.formatDate(item.date)}`);
            barContainer.appendChild(bar);
            barWrapper.appendChild(barContainer);
            
            // Add date label to the X-axis container
            const labelDiv = document.createElement('div');
            labelDiv.className = 'x-label-container';
            
            const label = document.createElement('div');
            label.className = 'x-label';
            label.textContent = ActivityChart.formatDate(item.date);
            
            labelDiv.appendChild(label);
            xAxis.appendChild(labelDiv);
            
            barsContainer.appendChild(barWrapper);
        });

        // Assemble chart
        chartVis.appendChild(barsContainer);
        chartContainer.appendChild(yAxis);
        chartContainer.appendChild(chartVis);
        chartContainer.appendChild(xAxis);
        
        chartWrapper.appendChild(header);
        chartWrapper.appendChild(chartContainer);
        this.container.appendChild(chartWrapper);
    }

    // Method to update chart data
    updateData(newData) {
        this.data = newData;
        const dataMax = Math.max(...this.data.map(item => item.count), 0);
        this.maxValue = Math.max(5, this.roundUpToNiceNumber(dataMax));
        this.render();
    }
}

// Function to process raw user/pet data into daily counts
function processDataForChart(data, type) {
    // Get last 7 days
    const result = [];
    const today = new Date();
    
    // Create a map for the last 7 days with zero counts
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format
        result.push({
            date: dateString,
            count: 0
        });
    }
    
    // Count items created on each day
    if (type === 'users') {
      
        /*if (!data || data.length === 0) {
            // Add some sample data for demonstration
            for (let i = 0; i < 3; i++) {
                const randomDay = Math.floor(Math.random() * 7);
                if (result[randomDay]) {
                    result[randomDay].count += Math.floor(Math.random() * 5) + 1;
                }
            }
            return result;
        }*/
        
        // Process data 
        data.forEach(user => {
            if (!user.CREATEDAT) return;
            
            const createdDate = new Date(user.CREATEDAT);
            const dateString = createdDate.toISOString().split('T')[0];
            
            // Find if this date is in our result array (last 7 days)
            const dayRecord = result.find(day => day.date === dateString);
            if (dayRecord) {
                dayRecord.count++;
            }
        });
    } else if (type === 'pets') {
        // If there's no data, add sample data for demonstration
        /*if (!data || data.length === 0 || !data.some(user => user.animals && user.animals.length > 0)) {
            // Add some sample data for demonstration
            for (let i = 0; i < 5; i++) {
                const randomDay = Math.floor(Math.random() * 7);
                if (result[randomDay]) {
                    result[randomDay].count += Math.floor(Math.random() * 3) + 1;
                }
            }
            return result;
        }*/
        
        // Flatten all animals from all users
        const allAnimals = data.reduce((acc, user) => {
            if (user.animals && Array.isArray(user.animals)) {
                return [...acc, ...user.animals];
            }
            return acc;
        }, []);
        
        // Count animals by creation date
        allAnimals.forEach(animal => {
            if (!animal.CREATEDAT) return;
            
            const createdDate = new Date(animal.CREATEDAT);
            const dateString = createdDate.toISOString().split('T')[0];
            
            // Find if this date is in our result array
            const dayRecord = result.find(day => day.date === dateString);
            if (dayRecord) {
                dayRecord.count++;
            }
        });
    }
    
    return result;
}

// Initialize charts from dashboard data
function initCharts(dashboardData) {
    if (!dashboardData) {
        console.error('Dashboard data missing or invalid');
        // Create charts with sample data
        const sampleUserData = processDataForChart([], 'users');
        const samplePetData = processDataForChart([], 'pets');
        
        new ActivityChart('users-chart', 'New Users', '#3498db', sampleUserData);
        new ActivityChart('pets-chart', 'New Pets', '#e74c3c', samplePetData);
        return;
    }
    
    // Process data for users and pets charts
    const userData = processDataForChart(dashboardData.users || [], 'users');
    const petsData = processDataForChart(dashboardData.users || [], 'pets');
    
    // Create charts
    new ActivityChart('users-chart', 'New Users', '#3498db', userData);
    new ActivityChart('pets-chart', 'New Pets', '#e74c3c', petsData);
    
    console.log('Charts initialized with:', { userData, petsData });
}


window.chartModule = {
    ActivityChart,
    processDataForChart,
    initCharts
};