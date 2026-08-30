import fs from 'fs/promises';
import path from 'path';

import {
  generateHTML,
  generateJSON,
} from '@tiptap/html';

import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import { TableKit } from '@tiptap/extension-table';

import {
  TaskList,
  TaskItem,
} from '@tiptap/extension-list';

import prettier from 'prettier';


// ============================================================
// PATHS
// ============================================================

const ROOT =
  process.cwd();

const CONTENT_DIR =
  path.join(
    ROOT,
    'content'
  );

const MANIFEST_PATH =
  path.join(
    CONTENT_DIR,
    'manifest.json'
  );


const ResearchHeading =
  Heading.extend({

    addAttributes() {

      return {

        ...this.parent?.(),

        id: {

          default:
            null,

          parseHTML:
            element =>
              element.getAttribute(
                'id'
              ),

          renderHTML:
            attributes =>
              attributes.id
                ? {
                    id:
                      attributes.id,
                  }
                : {},

        },

      };

    },

  });


// ============================================================
// TIPTAP EXTENSIONS
//
// ResearchEditor.jsx와 반드시 동일한 schema를 사용한다.
// ============================================================

const extensions = [

  StarterKit.configure({

    heading:
      false,

  }),


  ResearchHeading.configure({

    levels: [
      1,
      2,
      3,
    ],

  }),


  TableKit,


  TaskList,


  TaskItem.configure({

    nested: true,

  }),

];


// ============================================================
// NORMALIZE
// ============================================================

async function normalizeHtml(
  html
) {

  /*
   * 기존 HTML
   *
   *     ↓
   *
   * TipTap document JSON
   *
   *     ↓
   *
   * TipTap canonical HTML
   *
   *     ↓
   *
   * Prettier
   *
   * 이렇게 해야 브라우저의 editor.getHTML()과
   * content/*.html의 구조가 동일해진다.
   */

  const json =
    generateJSON(
      html,
      extensions
    );


  const canonical =
    generateHTML(
      json,
      extensions
    );


  return prettier.format(
    canonical,
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
// MAIN
// ============================================================

async function main() {

  const rawManifest =
    await fs.readFile(
      MANIFEST_PATH,
      'utf8'
    );


  const manifest =
    JSON.parse(
      rawManifest
    );


  let changed = 0;
  let unchanged = 0;


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
      path.join(
        CONTENT_DIR,
        meta.file
      );


    const original =
      await fs.readFile(
        filePath,
        'utf8'
      );


    const normalized =
      await normalizeHtml(
        original
      );


    if (
      normalized ===
      original
    ) {

      console.log(
        `= ${pageId.padEnd(24)} ${meta.file}`
      );

      unchanged += 1;

      continue;

    }


    await fs.writeFile(
      filePath,
      normalized,
      'utf8'
    );


    console.log(
      `✓ ${pageId.padEnd(24)} ${meta.file}`
    );


    changed += 1;

  }


  console.log();
  console.log(
    `Changed:   ${changed}`
  );

  console.log(
    `Unchanged: ${unchanged}`
  );

  console.log(
    `Total:     ${
      changed +
      unchanged
    }`
  );

  console.log();
  console.log(
    'Wiki HTML normalization complete.'
  );

}


// ============================================================
// RUN
// ============================================================

main().catch(
  error => {

    console.error(
      'Wiki normalization failed:'
    );

    console.error(
      error
    );

    process.exit(1);

  }
);
