import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

const DATA_DIR = path.join(process.cwd(), 'data', 'jamcon');
const DATA_PATH = path.join(DATA_DIR, 'attendance.json');
const TIME_ZONE = 'Asia/Seoul';

function getDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function getMonthKey(dateKey) {
  return dateKey.slice(0, 7);
}

function addDays(dateKey, amount) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

async function readAttendance() {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf8');
    const data = JSON.parse(raw);

    return {
      entries: Array.isArray(data.entries) ? data.entries : [],
    };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return { entries: [] };
  }
}

async function writeAttendance(data) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tempPath = `${DATA_PATH}.tmp`;

  await fs.writeFile(
    tempPath,
    JSON.stringify(data, null, 2) + '\n',
    'utf8'
  );

  await fs.rename(tempPath, DATA_PATH);
}

function buildSummary(entries) {
  const today = getDateKey();
  const dates = [...new Set(entries.map((entry) => entry.date))].sort();
  const checkedToday = dates.includes(today);
  const monthKey = getMonthKey(today);

  const latestDate = dates.at(-1) ?? null;
  let streak = 0;

  if (latestDate) {
    const yesterday = addDays(today, -1);

    if (latestDate === today || latestDate === yesterday) {
      let cursor = latestDate;
      const dateSet = new Set(dates);

      while (dateSet.has(cursor)) {
        streak += 1;
        cursor = addDays(cursor, -1);
      }
    }
  }

  return {
    today,
    checkedToday,
    streak,
    totalDays: dates.length,
    monthDays: dates.filter((date) => date.startsWith(monthKey)).length,
    entries: [...entries].sort((a, b) =>
      b.checkedAt.localeCompare(a.checkedAt)
    ),
  };
}

export async function GET() {
  try {
    const data = await readAttendance();

    return NextResponse.json({
      ok: true,
      ...buildSummary(data.entries),
    });
  } catch (error) {
    console.error('[GET /api/jamcon/attendance]', error);

    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const data = await readAttendance();
    const today = getDateKey();

    if (!data.entries.some((entry) => entry.date === today)) {
      data.entries.push({
        date: today,
        checkedAt: new Date().toISOString(),
      });

      await writeAttendance(data);
    }

    return NextResponse.json({
      ok: true,
      ...buildSummary(data.entries),
    });
  } catch (error) {
    console.error('[POST /api/jamcon/attendance]', error);

    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
