export const works = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    masterPageId: 'welcome-home',
    pages: {
      'welcome-home': {
        title: 'Getting Started / Welcome',
        group: 'Getting Started',
        type: 'document',
      },
      'welcome-guide': {
        title: 'Getting Started / Guide',
        group: 'Getting Started',
        type: 'document',
      },
    },
    actions: [],
  },
  {
    id: 'example-project',
    name: 'Example Project',
    masterPageId: 'example-overview',
    pages: {
      'example-overview': {
        title: 'Example Project / Overview',
        group: 'Example Project',
        type: 'document',
      },
      'example-notes': {
        title: 'Example Project / Research Notes',
        group: 'Example Project',
        type: 'document',
      },
      'example-todo': {
        title: 'Example Project / TODO',
        group: 'Example Project',
        type: 'document',
      },
    },
    actions: [],
  },
];

export function buildPagesFromWorks() {
  const pages = {};
  for (const work of works) {
    for (const [pageId, page] of Object.entries(work.pages)) {
      pages[pageId] = {
        title: page.title,
        group: page.group,
        type: page.type,
        workId: work.id,
        text: '',
      };
    }
  }
  return pages;
}

export function findWorkByPageId(pageId) {
  return works.find((work) => Boolean(work.pages[pageId]));
}

export function getActionsForPage(pageId) {
  const work = findWorkByPageId(pageId);
  if (work == null) return [];
  return work.actions || [];
}

export function getMasterPageIdForPage(pageId) {
  const work = findWorkByPageId(pageId);
  return work?.masterPageId || null;
}
