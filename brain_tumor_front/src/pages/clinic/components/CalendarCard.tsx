/**
 * 일정 캘린더 카드
 * - 환자의 진료 일정을 달력 형태로 표시
 */
import { useState, useMemo } from 'react';
import type { Encounter } from '@/types/encounter';

interface CalendarCardProps {
  patientId: number;
  encounters: Encounter[];
}

export default function CalendarCard({
  patientId: _patientId,
  encounters,
}: CalendarCardProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // 현재 월의 첫째 날과 마지막 날
  const { firstDay, lastDay: _lastDay, daysInMonth } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    return {
      firstDay: first.getDay(),
      lastDay: last.getDate(),
      daysInMonth: last.getDate(),
    };
  }, [currentDate]);

  // 해당 월의 진료 일정
  const monthEncounters = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

    return encounters.filter((e) => e.encounter_date?.startsWith(monthStr));
  }, [currentDate, encounters]);

  // 날짜별 진료 맵
  const encountersByDate = useMemo(() => {
    const map: Record<string, Encounter[]> = {};
    monthEncounters.forEach((e) => {
      const day = parseInt(e.encounter_date?.split('-')[2] || '0', 10);
      if (!map[day]) map[day] = [];
      map[day].push(e);
    });
    return map;
  }, [monthEncounters]);

  // 이전 달
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  // 다음 달
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  // 오늘로 이동
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // 요일 헤더
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  // 달력 그리드 생성
  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];

    // 첫째 주 빈 칸
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // 날짜
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  }, [firstDay, daysInMonth]);

  const today = new Date();
  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="clinic-card">
      <div className="clinic-card-header">
        <h3>
          <span className="card-icon">📅</span>
          일정 캘린더
        </h3>
        <button className="btn btn-sm btn-secondary" onClick={goToToday}>
          오늘
        </button>
      </div>
      <div className="clinic-card-body calendar-body">
        {/* 월 네비게이션 */}
        <div className="calendar-nav">
          <button className="nav-btn" onClick={prevMonth}>&lt;</button>
          <span className="nav-title">
            {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
          </span>
          <button className="nav-btn" onClick={nextMonth}>&gt;</button>
        </div>

        {/* 요일 헤더 */}
        <div className="calendar-weekdays">
          {weekDays.map((day, idx) => (
            <div
              key={day}
              className={`weekday ${idx === 0 ? 'sun' : ''} ${idx === 6 ? 'sat' : ''}`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="calendar-grid">
          {calendarDays.map((day, idx) => (
            <div
              key={idx}
              className={`calendar-day ${day ? '' : 'empty'} ${day && isToday(day) ? 'today' : ''} ${
                day && encountersByDate[day] ? 'has-event' : ''
              }`}
            >
              {day && (
                <>
                  <span className="day-number">{day}</span>
                  {encountersByDate[day] && (
                    <div className="day-events">
                      {encountersByDate[day].slice(0, 2).map((e, i) => (
                        <div
                          key={i}
                          className={`event-dot ${e.status}`}
                          title={e.diagnosis || '진료'}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {/* 범례 */}
        <div className="calendar-legend">
          <div className="legend-item">
            <span className="event-dot scheduled"></span>
            <span>예약</span>
          </div>
          <div className="legend-item">
            <span className="event-dot in_progress"></span>
            <span>진행</span>
          </div>
          <div className="legend-item">
            <span className="event-dot completed"></span>
            <span>완료</span>
          </div>
        </div>
      </div>

      <style>{`
        .calendar-body {
          padding: 12px;
        }
        .calendar-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .nav-btn {
          width: 28px;
          height: 28px;
          border: 1px solid var(--border-color, #e0e0e0);
          background: white;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        .nav-btn:hover {
          background: var(--bg-secondary, #f5f5f5);
        }
        .nav-title {
          font-size: 14px;
          font-weight: 600;
        }
        .calendar-weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          text-align: center;
          margin-bottom: 4px;
        }
        .weekday {
          font-size: 11px;
          font-weight: 500;
          color: var(--text-secondary, #666);
          padding: 4px;
        }
        .weekday.sun { color: #e53935; }
        .weekday.sat { color: #1976d2; }
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
        }
        .calendar-day {
          aspect-ratio: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          border-radius: 4px;
          cursor: default;
          position: relative;
        }
        .calendar-day.empty {
          background: transparent;
        }
        .calendar-day.today {
          background: var(--primary, #1976d2);
          color: white;
        }
        .calendar-day.has-event .day-number {
          font-weight: 600;
        }
        .day-number {
          margin-bottom: 2px;
        }
        .day-events {
          display: flex;
          gap: 2px;
        }
        .event-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }
        .event-dot.scheduled {
          background: #ff9800;
        }
        .event-dot.in_progress {
          background: #2196f3;
        }
        .event-dot.completed {
          background: #4caf50;
        }
        .calendar-legend {
          display: flex;
          justify-content: center;
          gap: 16px;
          margin-top: 12px;
          padding-top: 8px;
          border-top: 1px solid var(--border-color, #e0e0e0);
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: var(--text-secondary, #666);
        }
      `}</style>
    </div>
  );
}
