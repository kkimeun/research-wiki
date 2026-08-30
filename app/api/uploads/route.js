import {
  mkdir,
  writeFile,
} from 'fs/promises';

import path from 'path';


export const runtime = 'nodejs';


function sanitizeSegment(value) {

  return String(
    value || 'misc'
  )
    .toLowerCase()
    .replace(
      /[^a-z0-9_-]+/g,
      '-'
    )
    .replace(
      /^-+|-+$/g,
      ''
    ) || 'misc';

}


function sanitizeFilename(
  filename
) {

  const parsed =
    path.parse(
      filename || 'image'
    );

  const name =
    parsed.name
      .replace(
        /[^a-zA-Z0-9_-]+/g,
        '-'
      )
      .replace(
        /^-+|-+$/g,
        ''
      ) || 'image';

  const extension =
    parsed.ext
      .toLowerCase()
      .replace(
        /[^a-z0-9.]/g,
        ''
      );

  return {
    name,
    extension,
  };

}


export async function POST(
  request
) {

  try {

    const formData =
      await request.formData();

    const file =
      formData.get(
        'file'
      );

    const workId =
      sanitizeSegment(
        formData.get(
          'workId'
        )
      );


    if (
      !file ||
      typeof file === 'string'
    ) {

      return Response.json(
        {
          ok: false,
          error:
            'No image file provided',
        },
        {
          status: 400,
        }
      );

    }


    const allowedTypes =
      new Set([
        'image/png',
        'image/jpeg',
        'image/webp',
        'image/gif',
      ]);


    if (
      !allowedTypes.has(
        file.type
      )
    ) {

      return Response.json(
        {
          ok: false,
          error:
            'Only PNG, JPG, WEBP, and GIF images are supported',
        },
        {
          status: 400,
        }
      );

    }


    /*
     * 20 MB 제한
     */
    if (
      file.size >
      20 * 1024 * 1024
    ) {

      return Response.json(
        {
          ok: false,
          error:
            'Image is larger than 20 MB',
        },
        {
          status: 400,
        }
      );

    }


    const {
      name,
      extension,
    } =
      sanitizeFilename(
        file.name
      );


    const uniqueName =
      `${Date.now()}-${name}${extension}`;


    const uploadDir =
      path.join(
        process.cwd(),
        'public',
        'uploads',
        workId
      );


    await mkdir(
      uploadDir,
      {
        recursive: true,
      }
    );


    const bytes =
      await file.arrayBuffer();


    await writeFile(
      path.join(
        uploadDir,
        uniqueName
      ),
      Buffer.from(
        bytes
      )
    );


    return Response.json({
      ok: true,

      url:
        `/uploads/${workId}/${uniqueName}`,

      filename:
        uniqueName,
    });

  } catch (error) {

    console.error(
      'Image upload failed:',
      error
    );


    return Response.json(
      {
        ok: false,

        error:
          error?.message ||
          'Image upload failed',
      },
      {
        status: 500,
      }
    );

  }

}
