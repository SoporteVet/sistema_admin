/**
 * Simple Chart System
 * Lightweight charts for dashboard statistics
 */

class Charts {
    constructor() {
        this.colors = {
            primary: '#6366f1',
            secondary: '#8b5cf6',
            success: '#10b981',
            warning: '#f59e0b',
            danger: '#ef4444'
        };
    }

    /**
     * Create a simple bar chart
     */
    createBarChart(container, data, options = {}) {
        const { width = 300, height = 150, color = this.colors.primary } = options;
        
        const maxValue = Math.max(...data.map(d => d.value), 1);
        
        return data.map((item, index) => {
            const barHeight = (item.value / maxValue) * height;
            const barWidth = width / data.length - 10;
            const x = (index * (barWidth + 10)) + 5;
            
            return `
                <div class="chart-bar" style="
                    width: ${barWidth}px;
                    height: ${barHeight}px;
                    left: ${x}px;
                    background: linear-gradient(180deg, ${color} 0%, ${this.darkenColor(color)} 100%);
                    border-radius: 4px 4px 0 0;
                    position: absolute;
                    bottom: 0;
                    transition: height 0.5s ease;
                " title="${item.label}: ${item.value}">
                    <div class="chart-bar-value">${item.value}</div>
                </div>
            `;
        }).join('');
    }

    /**
     * Create a simple pie/donut chart
     */
    createDonutChart(container, data, options = {}) {
        const { size = 120, strokeWidth = 10 } = options;
        const total = data.reduce((sum, item) => sum + item.value, 0);
        const radius = (size - strokeWidth) / 2;
        const circumference = 2 * Math.PI * radius;
        
        let currentOffset = 0;
        const colors = [this.colors.primary, this.colors.secondary, this.colors.success, this.colors.warning, this.colors.danger];
        
        return data.map((item, index) => {
            const percentage = (item.value / total) * 100;
            const strokeDasharray = (percentage / 100) * circumference;
            const strokeDashoffset = circumference - (currentOffset / 100) * circumference;
            const color = colors[index % colors.length];
            
            currentOffset += percentage;
            
            return `
                <circle
                    cx="${size/2}"
                    cy="${size/2}"
                    r="${radius}"
                    fill="none"
                    stroke="${color}"
                    stroke-width="${strokeWidth}"
                    stroke-dasharray="${strokeDasharray}"
                    stroke-dashoffset="${strokeDashoffset}"
                    transform="rotate(-90 ${size/2} ${size/2})"
                    class="chart-segment"
                    style="transition: all 0.5s ease;"
                />
            `;
        }).join('');
    }

    darkenColor(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgb(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)})`;
    }

    /**
     * Render chart container
     */
    renderChart(type, containerId, data, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (type === 'bar') {
            container.innerHTML = `
                <div class="chart-container" style="position: relative; width: ${options.width || 300}px; height: ${options.height || 150}px;">
                    ${this.createBarChart(container, data, options)}
                </div>
            `;
        } else if (type === 'donut') {
            const size = options.size || 120;
            container.innerHTML = `
                <div class="chart-container" style="position: relative; width: ${size}px; height: ${size}px;">
                    <svg width="${size}" height="${size}">
                        ${this.createDonutChart(container, data, options)}
                    </svg>
                    <div class="chart-center" style="
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        text-align: center;
                    ">
                        <div style="font-size: 24px; font-weight: 700; color: var(--color-text);">${data.reduce((sum, item) => sum + item.value, 0)}</div>
                        <div style="font-size: 12px; color: var(--color-text-secondary);">Total</div>
                    </div>
                </div>
            `;
        }
    }
}

export default Charts;

