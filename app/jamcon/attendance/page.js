"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import styles from "./attendance.module.css";

export default function AttendancePage() {
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [clickCount, setClickCount] = useState(0);
  const [diary, setDiary] = useState("");
  const [diaryStatus, setDiaryStatus] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [diarySavedText, setDiarySavedText] = useState("");
  const [loadedDate, setLoadedDate] = useState("");

  const loadAttendance = useCallback(async () => {
    try {
      setError("");

      const response = await fetch("/api/jamcon/attendance", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "출석 정보를 불러오지 못했어.");
      }

      setAttendance(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  useEffect(() => {
    if (attendance?.today && !selectedDate) {
      setSelectedDate(attendance.today);
    }
  }, [attendance?.today, selectedDate]);

  const repeatedCheckMessages = [
    "오늘의 출석은 이미 기록되어 있다.",
    "오늘의 출석은 진짜 기록되어 있다.",
    "오늘의 출석은 정말로 기록되어 있다.",
    "오늘의 출석은 확실히 기록되어 있다.",
    "오늘의 출석은 아무리 눌러도 기록되어 있다.",
    "오늘의 출석은 아직도 기록되어 있다.",
    "오늘의 출석은 이미 했다고 한다.",
    "오늘의 출석은 두 번 눌러도 한 번이다.",
    "오늘의 출석은 진짜진짜 기록되어 있다.",
    "오늘의 출석은 그만 확인해도 기록되어 있다.",
  ];

  useEffect(() => {
    if (!attendance?.today) return;

    const key = `jamcon-attendance-clicks-${attendance.today}`;
    const saved = Number(localStorage.getItem(key));

    if (Number.isFinite(saved) && saved >= 0) {
      setClickCount(saved);
    }
  }, [attendance?.today]);

  function increaseClickCount() {
    if (!attendance?.today) return;

    const key = `jamcon-attendance-clicks-${attendance.today}`;

    setClickCount((previous) => {
      const next = previous + 1;

      localStorage.setItem(key, String(next));

      return next;
    });
  }

  async function checkIn() {
    if (checking) {
      return;
    }

    try {
      setChecking(true);
      setError("");

      const response = await fetch("/api/jamcon/attendance", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "출석 체크에 실패했어.");
      }

      increaseClickCount();

      if (attendance?.checkedToday) {
        const current = statusMessage || "오늘의 출석은 이미 기록되어 있다.";

        const candidates = repeatedCheckMessages.filter(
          (message) => message !== current,
        );

        const next = candidates[Math.floor(Math.random() * candidates.length)];

        setStatusMessage(next);
      } else {
        setStatusMessage("오늘의 출석은 이미 기록되어 있다.");
      }

      setAttendance(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    if (!selectedDate) return;

    const controller = new AbortController();

    async function loadDiary() {
      setLoadedDate("");
      setDiary("");
      setDiarySavedText("");
      setDiaryStatus("불러오는 중...");

      try {
        const response = await fetch(
          `/api/jamcon/diary?date=${encodeURIComponent(selectedDate)}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error();
        }

        const text = data.text ?? "";

        setDiary(text);
        setDiarySavedText(text);
        setLoadedDate(selectedDate);
        setDiaryStatus("");
      } catch (error) {
        if (error.name !== "AbortError") {
          setDiary("");
          setDiarySavedText("");
          setLoadedDate("");
          setDiaryStatus("불러오기 실패");
        }
      }
    }

    loadDiary();

    return () => {
      controller.abort();
    };
  }, [selectedDate]);

  useEffect(() => {
    if (
      !selectedDate ||
      loadedDate !== selectedDate ||
      diary === diarySavedText
    ) {
      return;
    }

    setDiaryStatus("입력 중...");

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        setDiaryStatus("저장 중...");

        const response = await fetch("/api/jamcon/diary", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            date: selectedDate,
            text: diary,
          }),
          signal: controller.signal,
        });

        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error();
        }

        setDiarySavedText(diary);
        setDiaryStatus("저장됨");
      } catch (error) {
        if (error.name !== "AbortError") {
          setDiaryStatus("저장 실패");
        }
      }
    }, 600);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [diary, diarySavedText, loadedDate, selectedDate]);

  async function selectDiaryDate(date) {
    if (date === selectedDate) return;

    if (loadedDate === selectedDate && diary !== diarySavedText) {
      try {
        await fetch("/api/jamcon/diary", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            date: selectedDate,
            text: diary,
          }),
        });
      } catch {
        // 날짜 변경은 계속 진행
      }
    }

    setLoadedDate("");
    setSelectedDate(date);
  }

  if (loading) {
    return <main className={styles.loading}>출석부 여는 중...</main>;
  }

  const recent = attendance?.entries?.[0] ?? null;

  return (
    <main className={styles.page}>
      <div className={styles.scene}>
        <div className={styles.titleArea}>
          <div className={styles.eyebrow}>JAMCON / ATTENDANCE</div>

          <h1>출석체크</h1>

          <p>매일 한 번, 이유는 나중에 생각한다.</p>
        </div>

        <Link
          href="/"
          className={styles.backButton}
          aria-label="Research Wiki로 돌아가기"
        />

        {attendance?.checkedToday && clickCount > 0 && (
          <img
            src="/jamcon/click-sheep.png"
            alt=""
            className={styles.clickSheep}
            style={{
              transform: `scale(${Math.min(
                1 + Math.max(clickCount - 1, 0) * 0.045,
                10.0,
              )})`,
            }}
          />
        )}

        <section className={styles.statusArea}>
          <div className={styles.statusHeading}>
            <h2>오늘의 출석 상태</h2>
            <p>{attendance?.today}</p>
          </div>

          <button
            type="button"
            className={styles.checkButton}
            onClick={checkIn}
            disabled={checking}
          >
            {checking
              ? "기록 중..."
              : attendance?.checkedToday
                ? "오늘 출석 완료"
                : "출석 찍기"}
          </button>

          <span className={styles.statusNote}>
            {attendance?.checkedToday
              ? statusMessage || "오늘의 출석은 이미 기록되어 있다."
              : "아직 오늘 출석 전."}
          </span>

          {attendance?.checkedToday && clickCount > 0 && (
            <span className={styles.clickCount}>
              {clickCount}번째 누르는중....
            </span>
          )}

          <div className={styles.statCards}>
            <div>
              <span>총 출석</span>
              <strong>{attendance?.totalDays ?? 0}</strong>
              <small>DAY</small>
            </div>

            <div>
              <span>이번 달</span>
              <strong>{attendance?.monthDays ?? 0}</strong>
              <small>DAY</small>
            </div>

            <div>
              <span>연속 출석</span>
              <strong>{attendance?.streak ?? 0}</strong>
              <small>DAY</small>
            </div>
          </div>
        </section>

        <section className={styles.calendarArea}>
          <div className={styles.monthLabel}>
            {attendance?.today?.slice(0, 7).replace("-", ".")}
          </div>

          <Calendar
            today={attendance?.today}
            entries={attendance?.entries ?? []}
            selectedDate={selectedDate}
            onSelectDate={selectDiaryDate}
          />
        </section>

        <section className={styles.recentArea}>
          {recent ? (
            <div className={styles.recentItem}>
              <span className={styles.index}>01</span>

              <div>
                <strong>{recent.date}</strong>

                <small>
                  {new Date(recent.checkedAt).toLocaleTimeString("ko-KR", {
                    timeZone: "Asia/Seoul",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </small>
              </div>
            </div>
          ) : (
            <p className={styles.noRecord}>아직 기록 없음</p>
          )}
        </section>

        <section className={styles.diaryArea}>
          <span className={styles.diaryDate}>{selectedDate}</span>

          <textarea
            className={styles.diaryInput}
            value={diary}
            onChange={(event) => setDiary(event.target.value)}
            placeholder="오늘 있었던 일..."
            aria-label="오늘의 일기"
          />

          <span className={styles.diaryStatus}>{diaryStatus}</span>
        </section>

        <button
          type="button"
          className={styles.bottomCheckButton}
          onClick={checkIn}
          disabled={checking}
          aria-label="출석 찍기"
        />

        {error && <div className={styles.error}>{error}</div>}
      </div>
    </main>
  );
}

function Calendar({ today, entries, selectedDate, onSelectDate }) {
  if (!today) return null;

  const [year, month] = today.split("-").map(Number);

  const firstDay = new Date(year, month - 1, 1).getDay();

  const lastDay = new Date(year, month, 0).getDate();

  const checked = new Set(entries.map((entry) => entry.date));

  const cells = [];

  for (let i = 0; i < firstDay; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= lastDay; day += 1) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    cells.push({
      day,
      date,
      checked: checked.has(date),
      today: date === today,
    });
  }

  return (
    <div className={styles.calendar}>
      {cells.map((cell, index) =>
        cell ? (
          <button
            type="button"
            key={cell.date}
            onClick={() => onSelectDate(cell.date)}
            className={[
              styles.day,
              cell.checked ? styles.checked : "",
              cell.today ? styles.today : "",
              cell.date === selectedDate ? styles.selected : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {cell.day}

            {cell.checked && <span>✓</span>}
          </button>
        ) : (
          <div key={`empty-${index}`} className={styles.empty} />
        ),
      )}
    </div>
  );
}
