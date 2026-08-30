'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import ResearchEditor from '../components/ResearchEditor';

import {
  buildPagesFromWorks,
  findWorkByPageId,
  getActionsForPage,
  getMasterPageIdForPage,
} from '../config/workspaces';


// ============================================================
// DEFAULT DATA
// ============================================================

const DEFAULT_PAGES =
  buildPagesFromWorks();


/*
 * 기존 v3 localStorage를 그대로 사용.
 *
 * 중요한 점:
 * 코드에서 새로 추가된 page metadata와
 * 사용자가 기존에 수정한 text를 merge해서 사용한다.
 */
const STORAGE_KEY =
  'research-wiki-pages-v3';

// ============================================================
// STORAGE
// ============================================================

/*
 * content/*.html
 *
 * Wiki의 공식 저장본.
 *
 * GET /api/pages를 통해 읽는다.
 */
async function loadPagesFromFiles() {

  const response =
    await fetch(
      '/api/pages',
      {
        cache:
          'no-store',
      }
    );


  const data =
    await response.json();


  if (
    !response.ok ||
    !data.ok
  ) {

    throw new Error(
      data.error ||
      'Failed to load Wiki files'
    );

  }


  return data.pages;

}


/*
 * 저장 버튼을 눌렀을 때
 * 현재 page를 실제 content/*.html에 저장한다.
 */
async function savePageToFile(
  pageId,
  text
) {

  const response =
    await fetch(
      '/api/pages',
      {

        method:
          'PUT',

        headers: {

          'Content-Type':
            'application/json',

        },

        body:
          JSON.stringify({

            pageId,

            text,

          }),

      }
    );


  const data =
    await response.json();


  if (
    !response.ok ||
    !data.ok
  ) {

    throw new Error(
      data.error ||
      'Failed to save Wiki page'
    );

  }


  return data;

}

async function createPageInFiles(
  pageId,
  page
) {

  const response =
    await fetch(
      '/api/pages',
      {

        method:
          'POST',

        headers: {
          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify({

            pageId,

            title:
              page.title,

            group:
              page.group,

            type:
              page.type,

            workId:
              page.workId ??
              null,

            text:
              page.text,

          }),

      }
    );


  const data =
    await response.json();


  if (
    !response.ok ||
    !data.ok
  ) {

    throw new Error(
      data.error ||
      'Failed to create Wiki page'
    );

  }


  return data;

}


async function updatePageMetaInFiles(
  pageId,
  changes
) {

  const response =
    await fetch(
      '/api/pages',
      {

        method:
          'PATCH',

        headers: {
          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify({

            pageId,

            changes,

          }),

      }
    );


  const data =
    await response.json();


  if (
    !response.ok ||
    !data.ok
  ) {

    throw new Error(
      data.error ||
      'Failed to update page metadata'
    );

  }


  return data;

}


async function deletePageFromFiles(
  pageId
) {

  const response =
    await fetch(
      '/api/pages',
      {

        method:
          'DELETE',

        headers: {
          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify({
            pageId,
          }),

      }
    );


  const data =
    await response.json();


  if (
    !response.ok ||
    !data.ok
  ) {

    throw new Error(
      data.error ||
      'Failed to delete Wiki page'
    );

  }


  return data;

}


/*
 * localStorage는 더 이상 공식 Wiki 저장소가 아니다.
 *
 * 역할:
 *
 *   - 편집 중 draft autosave
 *   - 브라우저 crash / refresh recovery
 *
 * 공식 저장본:
 *
 *   content/*.html
 */
function loadLocalDrafts() {

  if (
    typeof window ===
    'undefined'
  ) {

    return {};

  }


  try {

    const raw =
      window.localStorage.getItem(
        STORAGE_KEY
      );


    if (!raw) {

      return {};

    }


    return JSON.parse(
      raw
    );

  } catch (
    error
  ) {

    console.error(
      'Failed to load local drafts:',
      error
    );


    return {};

  }

}


/*
 * 파일에서 읽은 page가 metadata의 기준이다.
 *
 * localStorage에서는 text만 복구한다.
 *
 * 이렇게 해야 오래된 localStorage의
 * group / type / title 등이 최신 파일 metadata를
 * 덮어쓰지 않는다.
 */
function mergeFilePagesWithDrafts(
  filePages,
  localPages
) {

  /*
   * content/*.html is the source of truth.
   *
   * localStorage는 draft/recovery 용도일 뿐,
   * 이미 manifest에 존재하는 공식 page의 본문을
   * 덮어쓰면 안 된다.
   *
   * 따라서 filePages의 text를 항상 우선한다.
   */
  const merged = {
    ...filePages,
  };


  /*
   * manifest에 아직 없는 local-only legacy page만
   * migration safety net으로 유지한다.
   */
  for (
    const [
      pageId,
      localPage,
    ]
    of Object.entries(
      localPages
    )
  ) {

    if (
      !merged[
        pageId
      ]
    ) {

      merged[
        pageId
      ] =
        localPage;

    }

  }


  return merged;

}

// ============================================================
// TEXT UTIL
// ============================================================

function htmlToPlainText(
  html
) {
  if (
    typeof window ===
    'undefined'
  ) {
    return html
      .replace(
        /<[^>]*>/g,
        '\n'
      )
      .replace(
        /\n\s*\n/g,
        '\n'
      )
      .trim();
  }

  const div =
    document.createElement(
      'div'
    );

  div.innerHTML =
    html;

  return (
    div.innerText ||
    div.textContent ||
    ''
  )
    .replace(
      /\n\s*\n\s*\n/g,
      '\n\n'
    )
    .trim();
}


// ============================================================
// WIKI UPDATE
// ============================================================

function extractWikiUpdate(
  answer
) {
  const match =
    answer.match(
      /\[WIKI UPDATE(?:\s+mode=["']?(replace|append|patch)["']?)?(?:\s+target=["']([^"']+)["'])?\]([\s\S]*?)\[\/WIKI UPDATE\]/i
    );

  if (!match) {
    return null;
  }

  return match[3].trim();
}


function getWikiUpdateMode(
  answer
) {
  const match =
    answer.match(
      /\[WIKI UPDATE(?:\s+mode=["']?(replace|append|patch)["']?)?(?:\s+target=["']([^"']+)["'])?\]/i
    );

  return (
    match?.[1]?.toLowerCase() ||
    'append'
  );
}


function getWikiUpdateTarget(
  answer
) {
  const match =
    answer.match(
      /\[WIKI UPDATE(?:\s+mode=["']?(replace|append|patch)["']?)?(?:\s+target=["']([^"']+)["'])?\]/i
    );

  return (
    match?.[2]?.trim() ||
    ''
  );
}


function normalizeSectionTitle(
  value
) {
  return String(
    value || ''
  )
    .replace(
      /\s+/g,
      ' '
    )
    .trim()
    .toLowerCase();
}


function patchWikiSection(
  originalHtml,
  patchHtml,
  target
) {

  if (!target) {
    throw new Error(
      'Patch target이 지정되지 않았어.'
    );
  }


  const parser =
    new DOMParser();


  const originalDoc =
    parser.parseFromString(
      originalHtml || '',
      'text/html'
    );


  const patchDoc =
    parser.parseFromString(
      patchHtml || '',
      'text/html'
    );


  const normalizedTarget =
    normalizeSectionTitle(
      target
    );


  const headings =
    Array.from(
      originalDoc.body.querySelectorAll(
        'h1, h2, h3'
      )
    );


  const targetHeading =
    headings.find(
      heading =>
        normalizeSectionTitle(
          heading.textContent
        ) === normalizedTarget
    );


  if (!targetHeading) {
    throw new Error(
      `Section을 찾지 못했어: ${target}`
    );
  }


  const targetLevel =
    Number(
      targetHeading.tagName.slice(
        1
      )
    );


  const oldSectionNodes = [
    targetHeading,
  ];


  let cursor =
    targetHeading.nextSibling;


  while (cursor) {

    if (
      cursor.nodeType === 1 &&
      /^H[1-6]$/.test(
        cursor.tagName
      )
    ) {

      const level =
        Number(
          cursor.tagName.slice(
            1
          )
        );


      if (
        level <=
        targetLevel
      ) {
        break;
      }

    }


    oldSectionNodes.push(
      cursor
    );


    cursor =
      cursor.nextSibling;

  }


  // 기존 section 내부 이미지/figure 보존
  const preservedMedia = [];

  const seenMedia =
    new Set();


  for (
    const node
    of oldSectionNodes
  ) {

    if (
      node.nodeType !== 1
    ) {
      continue;
    }


    const images = [];


    if (
      node.matches &&
      node.matches(
        'img'
      )
    ) {
      images.push(
        node
      );
    }


    if (
      node.querySelectorAll
    ) {

      images.push(
        ...Array.from(
          node.querySelectorAll(
            'img'
          )
        )
      );

    }


    for (
      const image
      of images
    ) {

      const media =
        image.closest(
          'figure'
        ) ||
        image;


      if (
        seenMedia.has(
          media
        )
      ) {
        continue;
      }


      seenMedia.add(
        media
      );


      preservedMedia.push(
        media.cloneNode(
          true
        )
      );

    }

  }


  // 새 patch에서 target section 찾기
  const patchHeadings =
    Array.from(
      patchDoc.body.querySelectorAll(
        'h1, h2, h3'
      )
    );


  const patchTargetHeading =
    patchHeadings.find(
      heading =>
        normalizeSectionTitle(
          heading.textContent
        ) === normalizedTarget
    );


  let newSectionNodes = [];


  if (patchTargetHeading) {

    const patchLevel =
      Number(
        patchTargetHeading.tagName.slice(
          1
        )
      );


    newSectionNodes.push(
      patchTargetHeading
    );


    let patchCursor =
      patchTargetHeading.nextSibling;


    while (patchCursor) {

      if (
        patchCursor.nodeType === 1 &&
        /^H[1-6]$/.test(
          patchCursor.tagName
        )
      ) {

        const level =
          Number(
            patchCursor.tagName.slice(
              1
            )
          );


        if (
          level <=
          patchLevel
        ) {
          break;
        }

      }


      newSectionNodes.push(
        patchCursor
      );


      patchCursor =
        patchCursor.nextSibling;

    }

  } else {

    newSectionNodes = [
      targetHeading.cloneNode(
        true
      ),
      ...Array.from(
        patchDoc.body.childNodes
      ),
    ];

  }


  // 새 patch가 같은 src 이미지를 이미 포함하면 중복 복원하지 않음
  const newImageSources =
    new Set();


  for (
    const node
    of newSectionNodes
  ) {

    if (
      node.nodeType !== 1
    ) {
      continue;
    }


    const images = [];


    if (
      node.matches &&
      node.matches(
        'img'
      )
    ) {
      images.push(
        node
      );
    }


    if (
      node.querySelectorAll
    ) {

      images.push(
        ...Array.from(
          node.querySelectorAll(
            'img'
          )
        )
      );

    }


    for (
      const image
      of images
    ) {

      const src =
        image.getAttribute(
          'src'
        );


      if (src) {
        newImageSources.add(
          src
        );
      }

    }

  }


  const mediaToRestore =
    preservedMedia.filter(
      media => {

        const image =
          media.matches &&
          media.matches(
            'img'
          )
            ? media
            : media.querySelector(
                'img'
              );


        const src =
          image?.getAttribute(
            'src'
          );


        return (
          src &&
          !newImageSources.has(
            src
          )
        );

      }
    );


  /*
   * 일단 보존 이미지는 새 section heading 바로 아래에 복원.
   */
  if (
    mediaToRestore.length >
    0
  ) {

    newSectionNodes.splice(
      1,
      0,
      ...mediaToRestore
    );

  }


  const fragment =
    originalDoc.createDocumentFragment();


  for (
    const node
    of newSectionNodes
  ) {

    fragment.appendChild(
      originalDoc.importNode(
        node,
        true
      )
    );

  }


  targetHeading.parentNode.insertBefore(
    fragment,
    targetHeading
  );


  for (
    const node
    of oldSectionNodes
  ) {

    if (
      node.parentNode
    ) {

      node.parentNode.removeChild(
        node
      );

    }

  }


  return originalDoc.body.innerHTML;

}


function normalizeWikiUpdate(
  text
) {
  const trimmed =
    text.trim();

  if (!trimmed) {
    return '';
  }


  /*
   * 이미 HTML이면 그대로 사용.
   */
  if (
    /<(h1|h2|h3|p|ul|ol|li|pre|blockquote|strong|em)[\s>]/i.test(
      trimmed
    )
  ) {
    return trimmed;
  }


  /*
   * 간단한 Markdown이면 HTML로 변환.
   */
  const lines =
    trimmed.split('\n');

  let html = '';

  let inList =
    false;


  function closeList() {
    if (inList) {
      html += '</ul>';

      inList =
        false;
    }
  }


  for (
    const rawLine
    of lines
  ) {
    const line =
      rawLine.trim();


    if (!line) {
      closeList();

      continue;
    }


    if (
      line.startsWith(
        '### '
      )
    ) {
      closeList();

      html +=
        `<h3>${line.slice(
          4
        )}</h3>`;

      continue;
    }


    if (
      line.startsWith(
        '## '
      )
    ) {
      closeList();

      html +=
        `<h2>${line.slice(
          3
        )}</h2>`;

      continue;
    }


    if (
      line.startsWith(
        '# '
      )
    ) {
      closeList();

      html +=
        `<h1>${line.slice(
          2
        )}</h1>`;

      continue;
    }


    if (
      line.startsWith(
        '- '
      ) ||
      line.startsWith(
        '* '
      )
    ) {
      if (!inList) {
        html += '<ul>';

        inList =
          true;
      }

      html +=
        `<li>${line.slice(
          2
        )}</li>`;

      continue;
    }


    closeList();

    html +=
      `<p>${line}</p>`;
  }


  closeList();

  return html;
}


// ============================================================
// MAIN
// ============================================================

export default function Home() {

  const [
    pages,
    setPages,
  ] =
    useState({});


  const [
    currentId,
    setCurrentId,
  ] =
    useState('');


  const [
    draft,
    setDraft,
  ] =
    useState('');


  const [
    status,
    setStatus,
  ] =
    useState(
      'Wiki 불러오는 중...'
    );


  const [
    search,
    setSearch,
  ] =
    useState('');


  const [
    editingMeta,
    setEditingMeta,
  ] =
    useState(false);


  // ==========================================================
  // CHATGPT BRIDGE
  // ==========================================================

  const [
    question,
    setQuestion,
  ] =
    useState('');


  const [
    includeMaster,
    setIncludeMaster,
  ] =
    useState(true);


  const [
    gptAnswer,
    setGptAnswer,
  ] =
    useState('');


  const [
    pendingUpdate,
    setPendingUpdate,
  ] =
    useState('');


  const [
    bridgeMessage,
    setBridgeMessage,
  ] =
    useState(
      '현재 페이지를 기준으로 ChatGPT에 질문할 수 있어.'
    );


  // ==========================================================
  // QUICK ACTION
  // ==========================================================

  const [
    actionMessage,
    setActionMessage,
  ] =
    useState(
      'Quick Action을 누르면 필요한 작업을 준비해.'
    );

  const [
    isLoaded,
    setIsLoaded,
  ] =
    useState(false);


  // ==========================================================
  // LOAD
  // ==========================================================

  useEffect(() => {

    let cancelled =
      false;


    async function initializeWiki() {

      try {

        /*
         * 1.
         * content/*.html에서 공식 Wiki를 읽는다.
         */
        const filePages =
          await loadPagesFromFiles();


        if (cancelled) {
          return;
        }


        /*
         * 2.
         * localStorage의 draft를 읽는다.
         */
        const localPages =
          loadLocalDrafts();


        /*
         * 3.
         * metadata는 file 기준,
         * text는 local draft가 있으면 복구.
         */
        const restored =
          mergeFilePagesWithDrafts(
            filePages,
            localPages
          );


        if (cancelled) {
          return;
        }


        setPages(
          restored
        );


        /*
         * 기본 시작 page.
         */
        const first = Object.keys(restored)[0];


        if (first) {

          setCurrentId(
            first
          );


          setDraft(
            restored[
              first
            ]?.text ||
            ''
          );

        }


        setIsLoaded(
          true
        );


        setStatus(
          '파일에서 불러옴'
        );

      } catch (
        error
      ) {

        console.error(
          'Wiki file load failed:',
          error
        );


        /*
         * 파일 API가 실패해도
         * localStorage draft가 있다면
         * 최소한 Wiki 내용을 복구한다.
         */
        const localPages =
          loadLocalDrafts();


        const restored =
          Object.keys(
            localPages
          ).length
            ? localPages
            : DEFAULT_PAGES;


        if (cancelled) {
          return;
        }


        setPages(
          restored
        );


        const first = Object.keys(restored)[0];


        if (first) {

          setCurrentId(
            first
          );


          setDraft(
            restored[
              first
            ]?.text ||
            ''
          );

        }


        setIsLoaded(
          true
        );


        setStatus(
          '파일 로드 실패 — 브라우저 draft 사용 중'
        );

      }

    }


    initializeWiki();


    return () => {

      cancelled =
        true;

    };

  }, []);


  // ==========================================================
  // DRAFT AUTOSAVE
  // ==========================================================

  useEffect(() => {

    if (
      !isLoaded
    ) {

      return;

    }


    if (
      typeof window ===
      'undefined'
    ) {

      return;

    }


    try {

      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          pages
        )
      );

    } catch (
      error
    ) {

      console.error(
        'Draft autosave failed:',
        error
      );

    }

  }, [
    pages,
    isLoaded,
  ]);

  // ==========================================================
  // CURRENT PAGE
  // ==========================================================

  const current =
    pages[currentId] || {
      title:
        'Untitled',

      group:
        'Other',

      type:
        'document',

      text:
        '',
    };


  /*
   * 현재 업무 정의.
   *
   * 현재 page가 속한 workspace definition을 찾는다.
   */
  const currentWork =
    useMemo(
      () =>
        findWorkByPageId(
          currentId
        ),

      [currentId]
    );


  /*
   * 현재 페이지의 Quick Actions.
   */
  const currentActions =
    useMemo(
      () =>
        getActionsForPage(
          currentId
        ),

      [currentId]
    );


  // ==========================================================
  // SIDEBAR SEARCH
  // ==========================================================

  const filteredGrouped =
    useMemo(() => {

      const result =
        {};


      const query =
        search
          .trim()
          .toLowerCase();


      Object.entries(
        pages
      ).forEach(
        ([
          id,
          page,
        ]) => {

          const plain =
            htmlToPlainText(
              page.text || ''
            )
              .toLowerCase();


          const matches =
            !query ||

            (
              page.title ||
              ''
            )
              .toLowerCase()
              .includes(
                query
              ) ||

            (
              page.group ||
              ''
            )
              .toLowerCase()
              .includes(
                query
              ) ||

            plain.includes(
              query
            );


          if (!matches) {
            return;
          }


          const group =
            page.group ||
            'Other';


          if (
            !result[
              group
            ]
          ) {

            result[
              group
            ] =
              [];

          }


          result[
            group
          ].push([
            id,
            page,
          ]);

        }
      );


      return result;

    }, [
      pages,
      search,
    ]);


  // ==========================================================
  // MASTER / DASHBOARD CONTEXT
  // ==========================================================

  const masterPageEntry =
    useMemo(() => {

      const masterId =
        getMasterPageIdForPage(
          currentId
        );


      if (
        !masterId ||
        masterId ===
          currentId ||
        !pages[
          masterId
        ]
      ) {
        return null;
      }


      return [
        masterId,
        pages[
          masterId
        ],
      ];

    }, [
      currentId,
      pages,
    ]);

  // ==========================================================
  // EDIT PAGE
  // ==========================================================

  async function saveDraft(
    next = draft
  ) {

    /*
     * 현재 React state에도 먼저 반영한다.
     *
     * 이 state는 AUTOSAVE effect를 통해
     * localStorage draft에도 저장된다.
     */
    setPages(
      (
        previous
      ) => ({

        ...previous,

        [currentId]: {

          ...previous[
            currentId
          ],

          text:
            next,

        },

      })
    );


    setStatus(
      '파일 저장 중...'
    );


    try {

      /*
       * 실제 영구 저장.
       *
       * /api/pages
       *     ↓
       * content/*.html
       */
      const result =
        await savePageToFile(
          currentId,
          next
        );


      setStatus(
        `파일 저장됨: ${result.file}`
      );

    } catch (
      error
    ) {

      console.error(
        'Wiki save failed:',
        error
      );


      /*
       * 파일 저장이 실패해도
       * React state/localStorage draft는
       * 그대로 남아 있다.
       */
      setStatus(
        '파일 저장 실패 — 브라우저 draft는 유지됨'
      );

    }

  }


  function handleEditorChange(
    html
  ) {

    setDraft(
      html
    );


    setPages(
      (
        previous
      ) => ({

        ...previous,

        [currentId]: {

          ...previous[
            currentId
          ],

          text:
            html,

        },

      })
    );


    /*
     * 여기서는 실제 content/*.html에
     * 저장하지 않는다.
     *
     * localStorage draft만 autosave된다.
     */
    setStatus(
      '브라우저 draft 자동 저장됨'
    );

  }

  // ==========================================================
  // PAGE METADATA
  // ==========================================================

  function updatePageMeta(
    field,
    value
  ) {

    setPages(
      previous => ({

        ...previous,

        [currentId]: {

          ...previous[
            currentId
          ],

          [field]:
            value,

        },

      })
    );


    setStatus(
      '페이지 정보 수정됨 — 저장 필요'
    );

  }


  async function savePageMeta() {

    const page =
      pages[
        currentId
      ];


    if (!page) {
      return;
    }


    await updatePageMetaInFiles(
      currentId,
      {

        title:
          page.title,

        group:
          page.group,

        type:
          page.type,

        workId:
          page.workId ??
          null,

      }
    );

  }


  async function saveCurrentPage() {

    setStatus(
      '파일 저장 중...'
    );


    try {

      await Promise.all([

        savePageToFile(
          currentId,
          current.text ||
          ''
        ),

        savePageMeta(),

      ]);


      setStatus(
        '파일 + 페이지 정보 저장됨'
      );

    } catch (
      error
    ) {

      console.error(
        'Wiki save failed:',
        error
      );


      setStatus(
        '저장 실패 — 브라우저 draft는 유지됨'
      );

    }

  }


  // ==========================================================
  // SELECT PAGE
  // ==========================================================

  async function selectPage(
    id
  ) {

    if (
      id ===
      currentId
    ) {
      return;
    }


    /*
     * 페이지 이동 자체는 실제 파일을 수정하지 않는다.
     *
     * 편집 중인 내용은 React state/localStorage draft에
     * 이미 보존되어 있으며, content/*.html은 사용자가
     * 명시적으로 "저장"을 눌렀을 때만 변경한다.
     */
    setCurrentId(
      id
    );


    setDraft(
      pages[
        id
      ]?.text ||
      ''
    );


    setEditingMeta(
      false
    );


    setQuestion(
      ''
    );

    setGptAnswer(
      ''
    );

    setPendingUpdate(
      ''
    );


    setBridgeMessage(
      `“${pages[id]?.title || id}” 페이지를 열었어.`
    );


    setActionMessage(
      'Quick Action을 누르면 필요한 작업을 준비해.'
    );


    setStatus(
      '페이지 열림'
    );

  }


  // ==========================================================
  // NEW PAGE
  // ==========================================================

  async function newPage() {

    const id =
      `note-${Date.now()}`;


    const page = {

      title:
        '새 연구 노트',

      group:
        current.group ||
        'Notes',

      workId:
        current.workId ||
        null,

      type:
        'document',

      text:
        '<h1>새 연구 노트</h1><h2>Notes</h2><p></p>',

    };


    setStatus(
      '새 페이지 생성 중...'
    );


    try {

      const result =
        await createPageInFiles(
          id,
          page
        );


      /*
       * 서버가 canonical HTML로 저장한 결과를
       * 그대로 state에도 사용.
       */
      const savedPage = {

        ...page,

        text:
          result.page?.text ||
          page.text,

      };


      setPages(
        (
          previous
        ) => ({

          ...previous,

          [id]:
            savedPage,

        })
      );


      setCurrentId(
        id
      );


      setDraft(
        savedPage.text
      );


      setEditingMeta(
        true
      );


      setQuestion(
        ''
      );

      setGptAnswer(
        ''
      );

      setPendingUpdate(
        ''
      );


      setStatus(
        '새 페이지 생성됨'
      );

    } catch (
      error
    ) {

      console.error(
        'Page creation failed:',
        error
      );


      setStatus(
        '새 페이지 생성 실패'
      );

    }

  }


  // ==========================================================
  // DELETE PAGE
  // ==========================================================

  async function deletePage() {

    const ids =
      Object.keys(
        pages
      );


    if (
      ids.length <= 1
    ) {

      alert(
        '최소 한 개의 페이지는 남겨둬야 해.'
      );

      return;

    }


    const confirmed =
      window.confirm(
        `“${current.title}” 페이지를 삭제할까?`
      );


    if (!confirmed) {
      return;
    }


    setStatus(
      '페이지 삭제 중...'
    );


    try {

      /*
       * manifest + 실제 HTML 삭제.
       */
      await deletePageFromFiles(
        currentId
      );


      const nextPages = {
        ...pages,
      };


      delete nextPages[
        currentId
      ];


      const nextId =
        Object.keys(
          nextPages
        )[0];


      setPages(
        nextPages
      );


      setCurrentId(
        nextId
      );


      setDraft(
        nextPages[
          nextId
        ]?.text ||
        ''
      );


      setEditingMeta(
        false
      );


      setStatus(
        '페이지 삭제됨'
      );

    } catch (
      error
    ) {

      console.error(
        'Page deletion failed:',
        error
      );


      setStatus(
        '페이지 삭제 실패'
      );

    }

  }


  // ==========================================================
  // GENERIC QUICK ACTION ENGINE
  // ==========================================================

  function runAction(
    action
  ) {

    if (
      action.type ===
      'copy-command'
    ) {

      navigator.clipboard
        .writeText(
          action.command
        )
        .then(() => {

          setActionMessage(
            action.successMessage ||
            `${action.label} 준비 완료`
          );

        })
        .catch(() => {

          setActionMessage(
            '클립보드 복사에 실패했어.'
          );

        });


      return;

    }


    setActionMessage(
      `지원하지 않는 action type: ${action.type}`
    );

  }


  // ==========================================================
  // CHATGPT PACKAGE
  // ==========================================================

  function createChatGPTPackage() {

    if (
      !question.trim()
    ) {

      setBridgeMessage(
        '먼저 질문을 입력해줘.'
      );

      return;

    }


    const currentText =
      htmlToPlainText(
        draft
      );


    let context = `
==============================
CURRENT PAGE
==============================

Work:
${currentWork?.name || current.group}

Page title:
${current.title}

Document:
${currentText}
`.trim();


    if (
      includeMaster &&
      masterPageEntry
    ) {

      const [
        ,
        masterPage,
      ] =
        masterPageEntry;


      const masterText =
        htmlToPlainText(
          masterPage.text
        );


      context += `


==============================
RELATED MASTER / DASHBOARD
==============================

Page title:
${masterPage.title}

Document:
${masterText}
`;

    }


    const packageText = `
나는 개인 Research Wiki를 관리하고 있다.

아래 내용은 내가 현재 수행 중인 업무의 내부 문서다.

${context}


==============================
QUESTION
==============================

${question.trim()}


==============================
INSTRUCTIONS
==============================

1. 먼저 내 질문에 정상적으로 답변해줘.

2. 현재 업무와 문서 맥락을 우선적으로 사용해줘.

3. 현재 문서에 이미 있는 내용은 불필요하게 반복하지 마.

4. 불확실하거나 검증되지 않은 내용은 사실처럼 단정하지 마.

5. Research Wiki에 반영할 내용이 있다면
   답변 마지막에 WIKI UPDATE를 만들어줘.

6. 현재 페이지의 특정 section만 수정, 보강, 정리하는 요청이면
   기본적으로 patch mode를 사용해줘.

[WIKI UPDATE mode="patch" target="Signal topology"]
<h2>Signal topology</h2>
<p>수정된 section의 최종 내용</p>
[/WIKI UPDATE]

patch의 target에는 CURRENT PAGE에 실제로 존재하는
heading 제목을 정확히 사용해줘.

예:
- Signal topology
- Parton-level final state
- Signal mass scan
- Samples used in the current ML study

patch mode에서는 해당 section의 최종 HTML 전체만 반환하고,
다른 section의 내용은 포함하지 마.

중요:
사용자가 Wiki editor에서 직접 삽입한 기존 이미지는
Wiki가 patch 시 자동으로 보존한다.
따라서 기존 이미지의 <img> HTML을 새로 만들거나
삭제하려고 하지 마.

7. 여러 section을 동시에 크게 다시 구성하거나,
   페이지 전체를 재작성하라는 요청에만
   replace mode를 사용해줘.

[WIKI UPDATE mode="replace"]
현재 페이지를 완전히 대체할 최종 HTML 전체
[/WIKI UPDATE]

replace mode에서는 변경된 부분만 주지 말고,
현재 페이지에 최종적으로 남아야 할 문서 전체를 작성해줘.

8. 기존 section을 수정하는 것이 아니라
   완전히 새로운 내용을 문서 뒤에 추가할 때는
   append mode를 사용해줘.

[WIKI UPDATE mode="append"]
기존 문서에 새로 추가할 HTML
[/WIKI UPDATE]

부분적인 설명 보강, 문장 수정, 특정 section 정리는
replace보다 patch를 우선 사용해줘.

9. WIKI UPDATE에는 단순 대화 전체가 아니라
   앞으로 다시 사용할 가치가 있는
   결론, 실행 방법, 설정값, 오류 해결법,
   TODO, 의사결정 사항을 넣어줘.

10. WIKI UPDATE 내부는 가능하면
    단순 HTML 형식으로 작성해줘.

<h2>제목</h2>
<p>설명</p>
<ul>
  <li>내용</li>
</ul>

11. 새로 기록할 가치가 있는 내용이 없다면
    WIKI UPDATE는 만들지 않아도 된다.
`.trim();


    navigator.clipboard
      .writeText(
        packageText
      )
      .then(() => {

        setBridgeMessage(
          '질문이 복사됐어. ChatGPT에 붙여넣고 보내면 돼.'
        );


        setPendingUpdate(
          ''
        );

      })
      .catch(() => {

        setBridgeMessage(
          '질문 복사에 실패했어.'
        );

      });

  }


  // ==========================================================
  // IMPORT GPT ANSWER
  // ==========================================================

  function inspectGPTAnswer() {

    if (
      !gptAnswer.trim()
    ) {

      setBridgeMessage(
        '먼저 ChatGPT 답변을 붙여넣어줘.'
      );

      return;

    }


    const extracted =
      extractWikiUpdate(
        gptAnswer
      );


    if (!extracted) {

      setPendingUpdate(
        ''
      );


      setBridgeMessage(
        '이 답변에는 WIKI UPDATE가 없어.'
      );


      return;

    }


    const normalized =
      normalizeWikiUpdate(
        extracted
      );


    setPendingUpdate(
      normalized
    );


    setBridgeMessage(
      '문서에 반영할 내용을 찾았어.'
    );

  }


  function appendWikiUpdate() {

    if (
      !pendingUpdate
    ) {
      return;
    }


    const updateMode =
      getWikiUpdateMode(
        gptAnswer
      );


    const updateTarget =
      getWikiUpdateTarget(
        gptAnswer
      );


    let nextDocument;


    try {

      if (
        updateMode ===
        'replace'
      ) {

        nextDocument =
          pendingUpdate;

      } else if (
        updateMode ===
        'patch'
      ) {

        nextDocument =
          patchWikiSection(
            draft,
            pendingUpdate,
            updateTarget
          );

      } else {

        nextDocument =
          `${draft}
           <hr />
           ${pendingUpdate}`;

      }

    } catch (error) {

      console.error(
        'Wiki update failed:',
        error
      );


      setBridgeMessage(
        error?.message ||
        'Wiki 반영에 실패했어.'
      );


      return;

    }


    setDraft(
      nextDocument
    );


    setPages(
      (
        previous
      ) => ({

        ...previous,

        [currentId]: {

          ...previous[
            currentId
          ],

          text:
            nextDocument,

        },

      })
    );


    setGptAnswer(
      ''
    );


    setPendingUpdate(
      ''
    );


    setBridgeMessage(
      updateMode === 'replace'
        ? '현재 문서 전체를 교체했어.'
        : updateMode === 'patch'
          ? `\"${updateTarget}\" section을 수정했어. 기존 이미지는 보존했어.`
          : 'Wiki 내용을 현재 문서에 추가했어.'
    );


    setStatus(
      'GPT 답변 반영됨'
    );

  }


  // ==========================================================
  // UI
  // ==========================================================

  return (

    <main className="shell">


      {/* HEADER */}

      <header className="topbar">

        <div>

          <div className="eyebrow">
            PERSONAL RESEARCH OS
          </div>

          <h1>
            Research Wiki
          </h1>

        </div>


        <div className="actions">

          <button
            onClick={
              newPage
            }
          >
            + 새 페이지
          </button>


          <button
            onClick={
              deletePage
            }
          >
            페이지 삭제
          </button>


          <button
            className="primary"
            onClick={() =>
              saveDraft()
            }
          >
            저장
          </button>

        </div>

      </header>


      <section className="workspace">


        {/* ===================================================
            LEFT SIDEBAR
        ==================================================== */}

        <aside className="sidebar panel">

          <div className="panelTitle">
            Workspace
          </div>


          <input
            value={
              search
            }
            onChange={(
              event
            ) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="페이지 검색..."
            style={{

              width:
                '100%',

              marginTop:
                '10px',

              marginBottom:
                '16px',

              padding:
                '9px 10px',

              borderRadius:
                '8px',

              border:
                '1px solid #30363d',

              background:
                '#0d1117',

              color:
                'inherit',

              boxSizing:
                'border-box',

            }}
          />


          {Object.entries(
            filteredGrouped
          ).map(
            ([
              group,
              items,
            ]) => (

              <div
                className="topicGroup"
                key={
                  group
                }
              >

                <div className="groupName">
                  {group}
                </div>


                {items.map(
                  ([
                    id,
                    page,
                  ]) => (

                    <button
                      key={
                        id
                      }

                      className={
                        id ===
                        currentId

                          ? 'pageLink active'

                          : 'pageLink'
                      }

                      onClick={() =>
                        selectPage(
                          id
                        )
                      }
                    >

                      {page.title.replace(
                        `${group} / `,
                        ''
                      )}

                    </button>

                  )
                )}

              </div>

            )
          )}

        </aside>


        {/* ===================================================
            CENTER
        ==================================================== */}

        <section className="editor panel">


          <div className="editorHead">

            <div>


              {editingMeta ? (

                <div
                  style={{

                    display:
                      'flex',

                    gap:
                      '8px',

                    alignItems:
                      'center',

                    flexWrap:
                      'wrap',

                  }}
                >

                  <input
                    value={
                      current.title
                    }

                    onChange={(
                      event
                    ) =>
                      updatePageMeta(
                        'title',
                        event.target.value
                      )
                    }

                    placeholder="페이지 제목"
                  />


                  <input
                    value={
                      current.group
                    }

                    onChange={(
                      event
                    ) =>
                      updatePageMeta(
                        'group',
                        event.target.value
                      )
                    }

                    placeholder="그룹"
                  />


                  <button
                    onClick={async () => {

                      await saveCurrentPage();

                      setEditingMeta(
                        false
                      );

                    }}
                  >
                    완료
                  </button>

                </div>

              ) : (

                <div
                  style={{

                    display:
                      'flex',

                    gap:
                      '8px',

                    alignItems:
                      'center',

                  }}
                >

                  <div className="panelTitle">
                    {current.title}
                  </div>


                  <button
                    onClick={() =>
                      setEditingMeta(
                        true
                      )
                    }
                  >
                    ✎
                  </button>

                </div>

              )}


              <div className="status">
                {status}
              </div>

            </div>


            <button
              onClick={() =>
                saveCurrentPage()
              }
            >
              저장
            </button>

          </div>


          {/* QUICK ACTIONS */}

          {currentActions.length >
            0 && (

            <div
              style={{

                marginBottom:
                  '18px',

                padding:
                  '14px',

                border:
                  '1px solid #30363d',

                borderRadius:
                  '10px',

                background:
                  '#0d1117',

              }}
            >

              <div
                className="groupName"
                style={{
                  marginBottom:
                    '10px',
                }}
              >
                QUICK ACTIONS
              </div>


              <div
                style={{

                  display:
                    'flex',

                  gap:
                    '8px',

                  flexWrap:
                    'wrap',

                }}
              >

                {currentActions.map(
                  (
                    action
                  ) => (

                    <button
                      key={
                        action.id
                      }

                      className={
                        action.primary
                          ? 'primary'
                          : ''
                      }

                      onClick={() =>
                        runAction(
                          action
                        )
                      }
                    >
                      {action.label}
                    </button>

                  )
                )}

              </div>


              <div
                className="status"
                style={{
                  marginTop:
                    '10px',
                }}
              >
                {actionMessage}
              </div>

            </div>

          )}


          {isLoaded && pages[currentId] ? (

            <ResearchEditor
              key={
                currentId
              }

              content={
                pages[
                  currentId
                ].text ||
                ''
              }

              onChange={
                handleEditorChange
              }

              workId={
                pages[
                  currentId
                ]?.workId ||
                'misc'
              }
            />

          ) : (

            <div
              className="tiptap-editor-content"
              style={{
                minHeight:
                  '200px',
              }}
            >
              Wiki 불러오는 중...
            </div>

          )}

        </section>


        {/* ===================================================
            ASSISTANT
        ==================================================== */}

        <aside className="chat panel">


          <div className="panelTitle">
            Assistant
          </div>


          <div
            className="bubble assistant"
            style={{
              marginBottom:
                '16px',
            }}
          >
            {bridgeMessage}
          </div>


          <div
            className="groupName"
            style={{
              marginBottom:
                '8px',
            }}
          >
            ASK
          </div>


          <textarea
            value={
              question
            }

            onChange={(
              event
            ) =>
              setQuestion(
                event.target.value
              )
            }

            placeholder="현재 업무에 대해 무엇을 물어볼까?"

            rows={
              5
            }
          />


          {masterPageEntry && (

            <label
              style={{

                display:
                  'flex',

                gap:
                  '8px',

                alignItems:
                  'center',

                margin:
                  '10px 0',

                fontSize:
                  '13px',

              }}
            >

              <input
                type="checkbox"

                checked={
                  includeMaster
                }

                onChange={(
                  event
                ) =>
                  setIncludeMaster(
                    event.target.checked
                  )
                }
              />


              관련 Master /
              Dashboard 포함

            </label>

          )}


          <button
            className="primary send"

            onClick={
              createChatGPTPackage
            }
          >
            ChatGPT 질문 복사
          </button>


          <hr
            style={{

              border:
                0,

              borderTop:
                '1px solid #30363d',

              margin:
                '20px 0',

            }}
          />


          <div
            className="groupName"
            style={{
              marginBottom:
                '8px',
            }}
          >
            IMPORT ANSWER
          </div>


          <textarea
            value={
              gptAnswer
            }

            onChange={(
              event
            ) =>
              setGptAnswer(
                event.target.value
              )
            }

            placeholder="ChatGPT 답변 전체를 붙여넣어..."

            rows={
              8
            }
          />


          <button
            className="send"

            onClick={
              inspectGPTAnswer
            }
          >
            Wiki 반영 내용 확인
          </button>


          {pendingUpdate && (

            <div
              style={{

                marginTop:
                  '18px',

                padding:
                  '14px',

                border:
                  '1px solid #343b45',

                borderRadius:
                  '10px',

                background:
                  '#0d1117',

              }}
            >

              <div className="groupName">
                WIKI UPDATE
              </div>


              <div
                style={{

                  margin:
                    '12px 0',

                  whiteSpace:
                    'pre-wrap',

                  fontSize:
                    '13px',

                }}
              >

                {htmlToPlainText(
                  pendingUpdate
                )}

              </div>


              <button
                className="primary send"

                onClick={
                  appendWikiUpdate
                }
              >
                {getWikiUpdateMode(
                  gptAnswer
                ) === 'replace'
                  ? '현재 문서 교체'
                  : getWikiUpdateMode(
                      gptAnswer
                    ) === 'patch'
                    ? `Section 수정: ${
                        getWikiUpdateTarget(
                          gptAnswer
                        ) ||
                        '?'
                      }`
                    : '현재 문서에 추가'}
              </button>


              <button
                className="send"

                onClick={() =>
                  setPendingUpdate(
                    ''
                  )
                }
              >
                취소
              </button>

            </div>

          )}

        </aside>

      </section>

    </main>

  );
}
