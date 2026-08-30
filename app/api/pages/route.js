import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import prettier from 'prettier';


// ============================================================
// PATHS
// ============================================================

const CONTENT_DIR =
  path.join(
    process.cwd(),
    'content'
  );

const MANIFEST_PATH =
  path.join(
    CONTENT_DIR,
    'manifest.json'
  );


// ============================================================
// MANIFEST
// ============================================================

async function readManifest() {

  const raw =
    await fs.readFile(
      MANIFEST_PATH,
      'utf8'
    );

  return JSON.parse(
    raw
  );

}


async function writeManifest(
  manifest
) {

  await fs.writeFile(
    MANIFEST_PATH,
    JSON.stringify(
      manifest,
      null,
      2
    ) + '\n',
    'utf8'
  );

}


// ============================================================
// SAFE PATH
// ============================================================

function resolveContentPath(
  relativePath
) {

  const resolved =
    path.resolve(
      CONTENT_DIR,
      relativePath
    );

  const root =
    path.resolve(
      CONTENT_DIR
    );


  if (
    resolved !== root &&
    !resolved.startsWith(
      root + path.sep
    )
  ) {

    throw new Error(
      'Invalid content path'
    );

  }


  return resolved;

}


// ============================================================
// HTML FORMAT
// ============================================================

async function formatHtml(
  html
) {

  return prettier.format(
    html,
    {

      parser:
        'html',

      printWidth:
        100,

      htmlWhitespaceSensitivity:
        'ignore',

    }
  );

}


// ============================================================
// GET
//
// 모든 page metadata + HTML 반환
// ============================================================

export async function GET() {

  try {

    const manifest =
      await readManifest();


    const pages = {};


    for (
      const [
        pageId,
        meta,
      ]
      of Object.entries(
        manifest
      )
    ) {

      const filePath =
        resolveContentPath(
          meta.file
        );


      const text =
        await fs.readFile(
          filePath,
          'utf8'
        );


      pages[
        pageId
      ] = {

        title:
          meta.title,

        group:
          meta.group,

        type:
          meta.type,

        workId:
          meta.workId ??
          null,

        text,

      };

    }


    return NextResponse.json({

      ok: true,

      pages,

    });

  } catch (
    error
  ) {

    console.error(
      '[GET /api/pages]',
      error
    );


    return NextResponse.json(
      {

        ok: false,

        error:
          error.message,

      },
      {
        status: 500,
      }
    );

  }

}


// ============================================================
// PUT
//
// 기존 page 본문 저장
// ============================================================

export async function PUT(
  request
) {

  try {

    const body =
      await request.json();


    const pageId =
      body?.pageId;

    const text =
      body?.text;


    if (
      !pageId ||
      typeof pageId !==
        'string'
    ) {

      return NextResponse.json(
        {
          ok: false,
          error:
            'pageId is required',
        },
        {
          status: 400,
        }
      );

    }


    if (
      typeof text !==
      'string'
    ) {

      return NextResponse.json(
        {
          ok: false,
          error:
            'text must be a string',
        },
        {
          status: 400,
        }
      );

    }


    const manifest =
      await readManifest();


    const meta =
      manifest[
        pageId
      ];


    if (!meta) {

      return NextResponse.json(
        {
          ok: false,
          error:
            `Unknown page: ${pageId}`,
        },
        {
          status: 404,
        }
      );

    }


    const filePath =
      resolveContentPath(
        meta.file
      );


    const formatted =
      await formatHtml(
        text
      );


    await fs.writeFile(
      filePath,
      formatted,
      'utf8'
    );


    return NextResponse.json({

      ok: true,

      pageId,

      file:
        meta.file,

    });

  } catch (
    error
  ) {

    console.error(
      '[PUT /api/pages]',
      error
    );


    return NextResponse.json(
      {
        ok: false,
        error:
          error.message,
      },
      {
        status: 500,
      }
    );

  }

}


// ============================================================
// POST
//
// 새 page 생성
// ============================================================

export async function POST(
  request
) {

  try {

    const body =
      await request.json();


    const pageId =
      body?.pageId;

    const title =
      body?.title ||
      '새 연구 노트';

    const group =
      body?.group ||
      'Notes';

    const type =
      body?.type ||
      'document';

    const workId =
      body?.workId ??
      null;

    const text =
      typeof body?.text ===
      'string'
        ? body.text
        : '<h1>새 연구 노트</h1><h2>Notes</h2><p></p>';


    if (
      !pageId ||
      typeof pageId !==
        'string'
    ) {

      return NextResponse.json(
        {
          ok: false,
          error:
            'pageId is required',
        },
        {
          status: 400,
        }
      );

    }


    /*
     * pageId를 filename에 그대로 쓰기 전에
     * 안전한 문자만 허용.
     */
    if (
      !/^[a-zA-Z0-9_-]+$/.test(
        pageId
      )
    ) {

      return NextResponse.json(
        {
          ok: false,
          error:
            'Invalid pageId',
        },
        {
          status: 400,
        }
      );

    }


    const manifest =
      await readManifest();


    if (
      manifest[
        pageId
      ]
    ) {

      return NextResponse.json(
        {
          ok: false,
          error:
            `Page already exists: ${pageId}`,
        },
        {
          status: 409,
        }
      );

    }


    /*
     * 사용자 생성 page는 일단 notes/ 아래 저장.
     *
     * group은 sidebar 분류용이고
     * 물리적인 저장 위치와 독립적으로 둔다.
     */
    const relativePath =
      `notes/${pageId}.html`;


    const filePath =
      resolveContentPath(
        relativePath
      );


    await fs.mkdir(
      path.dirname(
        filePath
      ),
      {
        recursive: true,
      }
    );


    const formatted =
      await formatHtml(
        text
      );


    await fs.writeFile(
      filePath,
      formatted,
      'utf8'
    );


    manifest[
      pageId
    ] = {

      title,

      group,

      type,

      file:
        relativePath,

      workId,

    };


    await writeManifest(
      manifest
    );


    return NextResponse.json({

      ok: true,

      pageId,

      file:
        relativePath,

      page: {

        title,

        group,

        type,

        workId,

        text:
          formatted,

      },

    });

  } catch (
    error
  ) {

    console.error(
      '[POST /api/pages]',
      error
    );


    return NextResponse.json(
      {
        ok: false,
        error:
          error.message,
      },
      {
        status: 500,
      }
    );

  }

}


// ============================================================
// PATCH
//
// page metadata 수정
//
// body:
//
// {
//   pageId,
//   changes: {
//     title,
//     group,
//     type
//   }
// }
// ============================================================

export async function PATCH(
  request
) {

  try {

    const body =
      await request.json();


    const pageId =
      body?.pageId;

    const changes =
      body?.changes;


    if (
      !pageId ||
      typeof pageId !==
        'string'
    ) {

      return NextResponse.json(
        {
          ok: false,
          error:
            'pageId is required',
        },
        {
          status: 400,
        }
      );

    }


    if (
      !changes ||
      typeof changes !==
        'object'
    ) {

      return NextResponse.json(
        {
          ok: false,
          error:
            'changes is required',
        },
        {
          status: 400,
        }
      );

    }


    const manifest =
      await readManifest();


    const meta =
      manifest[
        pageId
      ];


    if (!meta) {

      return NextResponse.json(
        {
          ok: false,
          error:
            `Unknown page: ${pageId}`,
        },
        {
          status: 404,
        }
      );

    }


    /*
     * client가 file 경로를 임의로 바꾸지 못하도록
     * 수정 가능한 metadata만 whitelist.
     */
    const allowedFields = [
      'title',
      'group',
      'type',
      'workId',
    ];


    for (
      const field
      of allowedFields
    ) {

      if (
        Object.prototype.hasOwnProperty.call(
          changes,
          field
        )
      ) {

        meta[
          field
        ] =
          changes[
            field
          ];

      }

    }


    await writeManifest(
      manifest
    );


    return NextResponse.json({

      ok: true,

      pageId,

      meta,

    });

  } catch (
    error
  ) {

    console.error(
      '[PATCH /api/pages]',
      error
    );


    return NextResponse.json(
      {
        ok: false,
        error:
          error.message,
      },
      {
        status: 500,
      }
    );

  }

}


// ============================================================
// DELETE
//
// page metadata + 실제 HTML 파일 삭제
// ============================================================

export async function DELETE(
  request
) {

  try {

    const body =
      await request.json();


    const pageId =
      body?.pageId;


    if (
      !pageId ||
      typeof pageId !==
        'string'
    ) {

      return NextResponse.json(
        {
          ok: false,
          error:
            'pageId is required',
        },
        {
          status: 400,
        }
      );

    }


    const manifest =
      await readManifest();


    const meta =
      manifest[
        pageId
      ];


    if (!meta) {

      return NextResponse.json(
        {
          ok: false,
          error:
            `Unknown page: ${pageId}`,
        },
        {
          status: 404,
        }
      );

    }


    /*
     * manifest에서 먼저 제거.
     */
    delete manifest[
      pageId
    ];


    await writeManifest(
      manifest
    );


    /*
     * 실제 HTML 파일도 제거.
     */
    const filePath =
      resolveContentPath(
        meta.file
      );


    await fs.rm(
      filePath,
      {
        force: true,
      }
    );


    return NextResponse.json({

      ok: true,

      pageId,

      file:
        meta.file,

    });

  } catch (
    error
  ) {

    console.error(
      '[DELETE /api/pages]',
      error
    );


    return NextResponse.json(
      {
        ok: false,
        error:
          error.message,
      },
      {
        status: 500,
      }
    );

  }

}
