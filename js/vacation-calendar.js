/**
 * Vacation Calendar System
 * Interactive visual calendar for vacation requests
 */

class VacationCalendar {
    constructor() {
        this.currentDate = new Date();
        this.selectedDates = [];
        this.monthNames = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        this.dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    }

    /**
     * Render calendar for vacation selection
     */
    renderCalendar(containerId, selectedStart = null, selectedEnd = null) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // Get first and last day of month
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        // Get vacation dates from database
        this.getVacationDates(year, month).then(vacationDates => {
            container.innerHTML = `
                <div class="vacation-calendar-container">
                    <div class="calendar-header">
                        <button class="calendar-nav-btn" data-action="prev" aria-label="Mes anterior">‹</button>
                        <h3>${this.monthNames[month]} ${year}</h3>
                        <button class="calendar-nav-btn" data-action="next" aria-label="Mes siguiente">›</button>
                    </div>
                    <div class="calendar-weekdays">
                        ${this.dayNames.map(day => `<div class="calendar-weekday">${day}</div>`).join('')}
                    </div>
                    <div class="calendar-days" id="calendar-days-grid">
                        ${this.renderDays(startingDayOfWeek, daysInMonth, selectedStart, selectedEnd, vacationDates)}
                    </div>
                    <div class="calendar-legend">
                        <div class="legend-item">
                            <span class="legend-color legend-available"></span>
                            <span>Disponible</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-color legend-selected"></span>
                            <span>Seleccionado</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-color legend-vacation"></span>
                            <span>Vacaciones</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-color legend-past"></span>
                            <span>Pasado</span>
                        </div>
                    </div>
                </div>
            `;

            // Add event listeners
            this.setupCalendarEvents(containerId, selectedStart, selectedEnd);
        });
    }

    renderDays(startingDay, daysInMonth, selectedStart, selectedEnd, vacationDates) {
        let html = '';
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Empty cells for days before month starts
        for (let i = 0; i < startingDay; i++) {
            html += '<div class="calendar-day empty"></div>';
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), day);
            const dateStr = this.formatDateForInput(date);
            const isPast = date < today;
            const isVacation = vacationDates.includes(dateStr);
            const isSelected = this.isDateSelected(dateStr, selectedStart, selectedEnd);
            const isToday = dateStr === this.formatDateForInput(today);

            let classes = 'calendar-day';
            if (isPast) classes += ' past';
            if (isVacation) classes += ' vacation';
            if (isSelected) classes += ' selected';
            if (isToday) classes += ' today';

            html += `
                <div class="${classes}" data-date="${dateStr}" data-day="${day}">
                    <span class="day-number">${day}</span>
                    ${isVacation ? '<span class="vacation-indicator">🏖️</span>' : ''}
                </div>
            `;
        }

        return html;
    }

    isDateSelected(dateStr, start, end) {
        if (!start || !end) return false;
        const date = new Date(dateStr);
        const startDate = new Date(start);
        const endDate = new Date(end);
        return date >= startDate && date <= endDate;
    }

    formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    async getVacationDates(year, month) {
        // Get all approved vacation requests from database
        const solicitudes = await window.db?.getAll('solicitudes') || [];
        const vacations = solicitudes.filter(s => 
            s.tipo === 'vacaciones' && 
            s.estado === 'aprobada' &&
            s.fechaInicio &&
            s.fechaFin
        );

        const dates = [];
        vacations.forEach(v => {
            const start = new Date(v.fechaInicio);
            const end = new Date(v.fechaFin);
            
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                if (d.getFullYear() === year && d.getMonth() === month) {
                    dates.push(this.formatDateForInput(d));
                }
            }
        });

        return dates;
    }

    setupCalendarEvents(containerId, selectedStart, selectedEnd) {
        const container = document.getElementById(containerId);
        const calendarDays = container.querySelector('#calendar-days-grid');
        
        // Navigation
        container.querySelectorAll('.calendar-nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                if (action === 'prev') {
                    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                } else {
                    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                }
                this.renderCalendar(containerId, selectedStart, selectedEnd);
            });
        });

        // Day selection
        if (calendarDays) {
            calendarDays.addEventListener('click', (e) => {
                const dayEl = e.target.closest('.calendar-day');
                if (!dayEl || dayEl.classList.contains('empty') || dayEl.classList.contains('past')) {
                    return;
                }

                const dateStr = dayEl.dataset.date;
                const fechaInicio = document.getElementById('vacaciones-fecha-inicio');
                const fechaFin = document.getElementById('vacaciones-fecha-fin');

                if (!fechaInicio || !fechaFin) return;

                // If no start date selected, or start date is after this date, set as start
                if (!fechaInicio.value || new Date(dateStr) < new Date(fechaInicio.value)) {
                    fechaInicio.value = dateStr;
                    fechaFin.value = '';
                } else {
                    // Set as end date
                    fechaFin.value = dateStr;
                }

                // Re-render calendar with selection
                this.renderCalendar(containerId, fechaInicio.value, fechaFin.value);
                
                // Trigger change event
                fechaInicio.dispatchEvent(new Event('change'));
                fechaFin.dispatchEvent(new Event('change'));
            });
        }
    }
}

export default VacationCalendar;



