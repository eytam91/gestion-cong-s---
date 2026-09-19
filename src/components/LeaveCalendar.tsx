import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, User } from 'lucide-react';
import { Employee, LeaveRecord } from '../types';
import { LEAVE_TYPE_LABELS } from '../utils/vacationCalc';

interface LeaveCalendarProps {
  employees: Employee[];
  leaveRecords: LeaveRecord[];
}

export const LeaveCalendar: React.FC<LeaveCalendarProps> = ({ employees, leaveRecords }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Navigation
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Generate Calendar Days
  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    const days = [];
    
    // Get the day of the week of the first day (0 = Sunday, 1 = Monday)
    let firstDayIndex = firstDayOfMonth.getDay() - 1;
    if (firstDayIndex === -1) firstDayIndex = 6; // Make Monday the first day of the week

    // Previous month's padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex; i > 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i + 1),
        isCurrentMonth: false,
      });
    }

    // Current month's days
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Next month's padding to complete the grid (usually 42 cells total for 6 weeks)
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentDate]);

  // Check if a date is within a leave record
  const isDateInLeave = (date: Date, record: LeaveRecord) => {
    const recordStart = new Date(record.startDate);
    recordStart.setHours(0, 0, 0, 0);
    
    const recordEnd = new Date(record.endDate);
    recordEnd.setHours(23, 59, 59, 999);
    
    const checkDate = new Date(date);
    checkDate.setHours(12, 0, 0, 0); // midday for safe comparison
    
    return checkDate >= recordStart && checkDate <= recordEnd;
  };

  // Get leaves for a specific date
  const getLeavesForDate = (date: Date) => {
    const activeLeaves = leaveRecords.filter(record => isDateInLeave(date, record));
    
    return activeLeaves.map(record => {
      const employee = employees.find(e => e.id === record.employeeId);
      return {
        record,
        employee,
      };
    }).filter(item => item.employee); // Only return if employee exists
  };

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col">
      <div className="p-4 md:p-6 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-50/50">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-100 rounded-lg">
            <CalendarIcon className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="font-bold text-stone-900 text-lg">Calendrier des Congés</h2>
            <p className="text-xs text-stone-500">Visualisation des absences planifiées</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleToday}
            className="px-3 py-1.5 text-xs font-semibold text-stone-700 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors shadow-sm"
          >
            Aujourd'hui
          </button>
          <div className="flex items-center bg-white border border-stone-200 rounded-lg shadow-sm">
            <button 
              onClick={handlePrevMonth}
              className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-50 rounded-l-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-3 py-1.5 text-sm font-bold text-stone-700 min-w-[120px] text-center">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </div>
            <button 
              onClick={handleNextMonth}
              className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-50 rounded-r-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6">
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs font-bold text-stone-400 uppercase tracking-wider py-2">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {daysInMonth.map((dayObj, i) => {
            const leaves = getLeavesForDate(dayObj.date);
            const today = isToday(dayObj.date);
            
            return (
              <div 
                key={i} 
                className={`min-h-[80px] sm:min-h-[100px] p-1.5 sm:p-2 border rounded-xl flex flex-col transition-colors group relative ${
                  dayObj.isCurrentMonth ? 'bg-white border-stone-100 hover:border-amber-200 hover:bg-amber-50/30' : 'bg-stone-50 border-transparent text-stone-400'
                } ${today ? 'ring-2 ring-amber-400 ring-offset-1 border-transparent' : ''}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-xs sm:text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                    today ? 'bg-amber-400 text-stone-900' : 
                    dayObj.isCurrentMonth ? 'text-stone-700' : 'text-stone-400'
                  }`}>
                    {dayObj.date.getDate()}
                  </span>
                  
                  {leaves.length > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-600 sm:hidden">
                      {leaves.length}
                    </span>
                  )}
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {leaves.map((leave, j) => (
                    <div 
                      key={j} 
                      className={`text-[9px] sm:text-[10px] font-semibold leading-tight px-1.5 py-1 rounded border shadow-sm truncate ${
                        leave.record.leaveType === 'CONGE_PAYE' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        leave.record.leaveType === 'MALADIE_JUSTIFIEE' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                        leave.record.leaveType === 'ABSENCE_NON_JUSTIFIEE' ? 'bg-red-50 text-red-700 border-red-100' :
                        'bg-blue-50 text-blue-700 border-blue-100'
                      }`}
                      title={`${leave.employee?.name} - ${LEAVE_TYPE_LABELS[leave.record.leaveType]}`}
                    >
                      {leave.employee?.name.split(' ')[0]}
                    </div>
                  ))}
                </div>
                
                {/* Tooltip for desktop if many leaves */}
                {leaves.length > 0 && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 z-20 mt-2 w-48 bg-stone-900 text-white p-3 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none hidden sm:block">
                    <p className="text-xs font-bold text-stone-400 mb-2 border-b border-stone-700 pb-1">
                      {dayObj.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    <div className="space-y-2">
                      {leaves.map((leave, j) => (
                        <div key={j} className="flex flex-col gap-0.5">
                          <span className="text-sm font-semibold">{leave.employee?.name}</span>
                          <span className="text-[10px] text-stone-400">{LEAVE_TYPE_LABELS[leave.record.leaveType]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
