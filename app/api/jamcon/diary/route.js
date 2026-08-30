import { promises as fs } from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "jamcon", "diary.json");

const TIME_ZONE = "Asia/Seoul";

function getToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function validDate(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

async function readDiary() {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      return { entries: {} };
    }

    throw error;
  }
}

async function writeDiary(data) {
  await fs.mkdir(path.dirname(DATA_FILE), {
    recursive: true,
  });

  const tmp = `${DATA_FILE}.tmp`;

  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");

  await fs.rename(tmp, DATA_FILE);
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const requested = url.searchParams.get("date");

    const date = requested && validDate(requested) ? requested : getToday();

    const data = await readDiary();

    return Response.json({
      ok: true,
      date,
      text: data.entries?.[date] ?? "",
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        ok: false,
        error: "일기를 불러오지 못했어.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const date =
      typeof body.date === "string" && validDate(body.date)
        ? body.date
        : getToday();

    const text = typeof body.text === "string" ? body.text.slice(0, 5000) : "";

    const data = await readDiary();

    data.entries ??= {};
    data.entries[date] = text;

    await writeDiary(data);

    return Response.json({
      ok: true,
      date,
      text,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        ok: false,
        error: "일기를 저장하지 못했어.",
      },
      { status: 500 },
    );
  }
}
