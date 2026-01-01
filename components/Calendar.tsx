
import React, { useState, useMemo } from 'react';
import type { ServiceInstance, ServiceType } from '../types';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';

interface CalendarProps {
  onDateSelect: (date: Date) => void;
  serviceInstances: ServiceInstance[];
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// Helper function to format date to YYYY-MM-DD string, ignoring timezone
const toYYYYMMDD = (date: Date): string => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const getServiceTypeCalendarColor = (type: ServiceType): string => {
    if (type === '전시대') return 'bg-blue-500';
    if (type === '호별') return 'bg-green-500';
    return 'bg-purple-500';
};

const Calendar: React.FC<CalendarProps> = ({ onDateSelect, serviceInstances }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDay = firstDayOfMonth.getDay();

  const servicesByDate = useMemo(() => {
    const map = new Map<string, ServiceInstance[]>();
    for (const instance of serviceInstances) {
      if (!map.has(instance.date)) {
        map.set(instance.date, []);
      }
      map.get(instance.date)!.push(instance);
    }
    // Sort services within each day by time
    for (const services of map.values()) {
        services.sort((a, b) => a.time.localeCompare(b.time));
    }
    return map;
  }, [serviceInstances]);

  const changeMonth = (offset: number) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const renderCalendarDays = () => {
    const days = [];
    // Blanks for days before the first of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(<div key={`empty-${i}`} className="border-r border-b border-gray-200"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dateString = toYYYYMMDD(date);
      const servicesForDay = servicesByDate.get(dateString) || [];
      const isToday = new Date().toDateString() === date.toDateString();

      days.push(
        <div
          key={day}
          onClick={() => onDateSelect(date)}
          className="relative pt-1 px-1 h-28 sm:h-36 border-r border-b border-gray-200 cursor-pointer transition-colors hover:bg-blue-50 flex flex-col overflow-hidden"
        >
          <span className={`text-sm self-end ${isToday ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold' : ''}`}>
            {day}
          </span>
          {servicesForDay.length > 0 && (
            <div className="flex-grow mt-1 space-y-1 overflow-y-auto text-[10px] sm:text-xs">
              {servicesForDay.slice(0, 3).map(service => {
                  const serviceStartTime = service.time.split('-')[0];
                  const serviceName = `${serviceStartTime} ${service.type} (${service.applicants.length})`;

                  return (
                    <div key={service.id} className={`p-1 rounded text-white ${getServiceTypeCalendarColor(service.type)}`}>
                      <p className="font-semibold truncate" title={serviceName}>
                          {serviceName}
                      </p>
                    </div>
                  );
              })}
              {servicesForDay.length > 3 && (
                  <div className="text-center font-bold text-gray-500 pt-1">...</div>
              )}
            </div>
          )}
        </div>
      );
    }
    return days;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-200">
          <ChevronLeftIcon className="h-6 w-6" />
        </button>
        <h2 className="text-xl font-semibold">
          {currentDate.toLocaleString('ko-KR', { year: 'numeric', month: 'long' })}
        </h2>
        <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-200">
          <ChevronRightIcon className="h-6 w-6" />
        </button>
      </div>
      <div className="grid grid-cols-7 border-t border-l border-gray-200">
        {WEEKDAYS.map(day => (
          <div key={day} className="text-center font-bold p-2 border-r border-b border-gray-200 bg-gray-50">
            {day}
          </div>
        ))}
        {renderCalendarDays()}
      </div>
    </div>
  );
};

export default Calendar;
