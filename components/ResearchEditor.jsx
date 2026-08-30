'use client';

import { useEffect, useRef, useState } from 'react';
import {
  useEditor,
  EditorContent,
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import { TableKit } from '@tiptap/extension-table';
import {
  TaskList,
  TaskItem,
} from '@tiptap/extension-list';

import Image from '@tiptap/extension-image';


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


const ResearchImage =
  Image.extend({

    addAttributes() {

      return {

        ...this.parent?.(),

        width: {

          default:
            '75%',

          parseHTML:
            element =>
              element.getAttribute(
                'data-width'
              ) ||
              element.style.width ||
              '75%',

          renderHTML:
            attributes => ({
              'data-width':
                attributes.width,
            }),

        },

        align: {

          default:
            'center',

          parseHTML:
            element =>
              element.getAttribute(
                'data-align'
              ) ||
              'center',

          renderHTML:
            attributes => ({
              'data-align':
                attributes.align,
            }),

        },

      };

    },


    renderHTML({
      HTMLAttributes,
    }) {

      const width =
        HTMLAttributes[
          'data-width'
        ] || '75%';

      const align =
        HTMLAttributes[
          'data-align'
        ] || 'center';


      const margin =
        align === 'left'
          ? '16px auto 16px 0'
          : align === 'right'
            ? '16px 0 16px auto'
            : '16px auto';


      return [
        'img',
        {
          ...HTMLAttributes,

          style:
            `display:block; width:${width}; max-width:100%; height:auto; margin:${margin}; border-radius:8px;`,
        },
      ];

    },

  });


export default function ResearchEditor({
  content = '',
  onChange,
  workId = 'misc',
}) {

  const imageInputRef =
    useRef(
      null
    );


  const [
    isUploadingImage,
    setIsUploadingImage,
  ] =
    useState(
      false
    );


  const [
    imageSelected,
    setImageSelected,
  ] =
    useState(
      false
    );


  // ==========================================================
  // EDITOR
  // ==========================================================

  const editor =
    useEditor({

      extensions: [

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


        ResearchImage.configure({
          inline: false,
          allowBase64: false,
        }),

      ],


      content:
        content || '',


      /*
       * Next.js SSR / hydration 문제 방지.
       */
      immediatelyRender:
        false,


      editorProps: {

        attributes: {

          class:
            'tiptap-editor-content',

        },


        handleClick(
          view,
          pos,
          event
        ) {

          const target =
            event.target;

          if (
            !(target instanceof Element)
          ) {
            return false;
          }


          const link =
            target.closest(
              'a'
            );

          if (!link) {
            return false;
          }


          const href =
            link.getAttribute(
              'href'
            );

          /*
           * #section 형태의 링크는
           * browser/router에 넘기지 않고
           * 현재 ResearchEditor 내부에서만 찾는다.
           */
          if (
            !href ||
            !href.startsWith(
              '#'
            )
          ) {
            return false;
          }


          event.preventDefault();
          event.stopPropagation();


          const targetId =
            decodeURIComponent(
              href.slice(1)
            );


          const anchor =
            Array.from(
              view.dom.querySelectorAll(
                '[id]'
              )
            ).find(
              element =>
                element.id ===
                targetId
            );


          if (!anchor) {

            console.warn(
              `[ResearchEditor] Anchor not found in current page: ${targetId}`
            );

            return true;
          }


          anchor.scrollIntoView({
            behavior:
              'smooth',
            block:
              'start',
          });


          return true;

        },


        handlePaste(
          view,
          event
        ) {

          const items =
            Array.from(
              event.clipboardData?.items ||
              []
            );


          const imageItem =
            items.find(
              item =>
                item.type?.startsWith(
                  'image/'
                )
            );


          if (!imageItem) {

            /*
             * 일반 텍스트/HTML paste는
             * TipTap 기본 동작을 그대로 사용.
             */
            return false;

          }


          const file =
            imageItem.getAsFile();


          if (!file) {
            return false;
          }


          /*
           * 브라우저가 blob 이미지를 직접 문서에 넣는 것을 막고
           * 우리 upload API를 사용한다.
           */
          event.preventDefault();


          /*
           * paste 순간의 cursor position 저장.
           * upload가 끝나는 동안 사용자가 다른 곳을 클릭해도
           * 원래 붙여넣은 위치에 이미지가 들어가게 한다.
           */
          const insertPos =
            view.state.selection.from;


          const formData =
            new FormData();


          formData.append(
            'file',
            file,
            file.name ||
              `pasted-image-${Date.now()}.png`
          );


          formData.append(
            'workId',
            workId ||
              'misc'
          );


          fetch(
            '/api/uploads',
            {
              method:
                'POST',

              body:
                formData,
            }
          )
            .then(
              async response => {

                const data =
                  await response.json();


                if (
                  !response.ok ||
                  !data.ok
                ) {

                  throw new Error(
                    data.error ||
                    'Image upload failed'
                  );

                }


                return data;

              }
            )
            .then(
              data => {

                const imageNode =
                  editor.schema.nodes.image.create({
                    src:
                      data.url,

                    alt:
                      file.name ||
                      'Pasted image',

                    title:
                      file.name ||
                      'Pasted image',

                    width:
                      '75%',

                    align:
                      'center',
                  });


                const transaction =
                  editor.state.tr.insert(
                    insertPos,
                    imageNode
                  );


                editor.view.dispatch(
                  transaction
                );

              }
            )
            .catch(
              error => {

                console.error(
                  'Pasted image upload failed:',
                  error
                );


                window.alert(
                  `이미지 붙여넣기 실패: ${
                    error?.message ||
                    'unknown error'
                  }`
                );

              }
            );


          return true;

        },

      },


      /*
       * 실제 사용자가 Editor 내용을 수정했을 때만
       * parent의 draft를 업데이트한다.
       */
      onUpdate: ({
        editor,
      }) => {

        if (
          typeof onChange ===
          'function'
        ) {

          onChange(
            editor.getHTML()
          );

        }

      },

    });


  // ==========================================================
  // IMAGE SELECTION SYNC
  // ==========================================================

  useEffect(() => {

    if (!editor) {
      return;
    }


    const updateImageSelection = () => {

      setImageSelected(
        editor.isActive(
          'image'
        )
      );

    };


    /*
     * 이미지 클릭 / cursor 이동 / selection 변경 시
     * React toolbar 상태를 즉시 갱신한다.
     */
    editor.on(
      'selectionUpdate',
      updateImageSelection
    );


    /*
     * 이미지 attribute 변경 뒤에도 상태를 유지.
     */
    editor.on(
      'transaction',
      updateImageSelection
    );


    updateImageSelection();


    return () => {

      editor.off(
        'selectionUpdate',
        updateImageSelection
      );


      editor.off(
        'transaction',
        updateImageSelection
      );

    };

  }, [
    editor,
  ]);


  // ==========================================================
  // EXTERNAL CONTENT SYNC
  // ==========================================================

  /*
   * Sidebar에서 다른 page를 선택하거나
   * content/*.html에서 새 내용을 읽어왔을 때
   * TipTap 내용을 동기화한다.
   *
   * 중요한 점:
   *
   * 이 동작은 "사용자 편집"이 아니므로
   * emitUpdate를 false로 해서 onUpdate가 발생하지
   * 않도록 한다.
   */
  useEffect(() => {

    if (!editor) {
      return;
    }


    const nextContent =
      content || '';


    const currentContent =
      editor.getHTML();


    if (
      currentContent ===
      nextContent
    ) {
      return;
    }


    editor.commands.setContent(
      nextContent,
      {
        emitUpdate: false,
      }
    );

  }, [
    editor,
    content,
  ]);


  // ==========================================================
  // EDITOR NOT READY
  // ==========================================================

  /*
   * useEditor()는 첫 render에서 null일 수 있다.
   *
   * editor.isActive() 등의 method를 호출하기 전에
   * 반드시 여기서 막아준다.
   */
  if (!editor) {

    return (
      <div className="research-editor">

        <div
          className="tiptap-editor-content"
          style={{
            minHeight:
              '200px',
          }}
        />

      </div>
    );

  }


  // ==========================================================
  // SAFE HELPERS
  // ==========================================================

  /*
   * 혹시 editor lifecycle 중 상태가 바뀌더라도
   * toolbar가 null editor 때문에 죽지 않도록 한다.
   */
  function isActive(
    ...args
  ) {

    return (
      editor?.isActive(
        ...args
      ) ?? false
    );

  }


  async function uploadImage(
    file
  ) {

    if (
      !file ||
      !editor
    ) {
      return;
    }


    try {

      setIsUploadingImage(
        true
      );


      const formData =
        new FormData();


      formData.append(
        'file',
        file
      );


      formData.append(
        'workId',
        workId ||
          'misc'
      );


      const response =
        await fetch(
          '/api/uploads',
          {
            method:
              'POST',

            body:
              formData,
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
          'Image upload failed'
        );

      }


      editor
        .chain()
        .focus()
        .setImage({
          src:
            data.url,

          alt:
            file.name,

          title:
            file.name,
        })
        .run();


    } catch (error) {

      console.error(
        error
      );


      window.alert(
        `이미지 업로드 실패: ${
          error?.message ||
          'unknown error'
        }`
      );


    } finally {

      setIsUploadingImage(
        false
      );


      if (
        imageInputRef.current
      ) {

        imageInputRef.current.value =
          '';

      }

    }

  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="research-editor">



      {/* =====================================================
          TOOLBAR
      ====================================================== */}

      <div className="editor-toolbar">


        {/* Bold */}

        <button
          type="button"

          onClick={() => {

            editor
              .chain()
              .focus()
              .toggleBold()
              .run();

          }}

          className={
            isActive(
              'bold'
            )
              ? 'active'
              : ''
          }
        >
          B
        </button>


        {/* Italic */}

        <button
          type="button"

          onClick={() => {

            editor
              .chain()
              .focus()
              .toggleItalic()
              .run();

          }}

          className={
            isActive(
              'italic'
            )
              ? 'active'
              : ''
          }
        >
          I
        </button>


        {/* H1 */}

        <button
          type="button"

          onClick={() => {

            editor
              .chain()
              .focus()
              .toggleHeading({
                level: 1,
              })
              .run();

          }}

          className={
            isActive(
              'heading',
              {
                level: 1,
              }
            )
              ? 'active'
              : ''
          }
        >
          H1
        </button>


        {/* H2 */}

        <button
          type="button"

          onClick={() => {

            editor
              .chain()
              .focus()
              .toggleHeading({
                level: 2,
              })
              .run();

          }}

          className={
            isActive(
              'heading',
              {
                level: 2,
              }
            )
              ? 'active'
              : ''
          }
        >
          H2
        </button>


        {/* H3 */}

        <button
          type="button"

          onClick={() => {

            editor
              .chain()
              .focus()
              .toggleHeading({
                level: 3,
              })
              .run();

          }}

          className={
            isActive(
              'heading',
              {
                level: 3,
              }
            )
              ? 'active'
              : ''
          }
        >
          H3
        </button>


        {/* Bullet list */}

        <button
          type="button"

          onClick={() => {

            editor
              .chain()
              .focus()
              .toggleBulletList()
              .run();

          }}

          className={
            isActive(
              'bulletList'
            )
              ? 'active'
              : ''
          }
        >
          • List
        </button>


        {/* Ordered list */}

        <button
          type="button"

          onClick={() => {

            editor
              .chain()
              .focus()
              .toggleOrderedList()
              .run();

          }}

          className={
            isActive(
              'orderedList'
            )
              ? 'active'
              : ''
          }
        >
          1. List
        </button>


        {/* Task list */}

        <button
          type="button"

          onClick={() => {

            editor
              .chain()
              .focus()
              .toggleTaskList()
              .run();

          }}

          className={
            isActive(
              'taskList'
            )
              ? 'active'
              : ''
          }
        >
          ☑ TODO
        </button>


        {/* Blockquote */}

        <button
          type="button"

          onClick={() => {

            editor
              .chain()
              .focus()
              .toggleBlockquote()
              .run();

          }}

          className={
            isActive(
              'blockquote'
            )
              ? 'active'
              : ''
          }
        >
          Quote
        </button>


        {/* Code block */}

        <button
          type="button"

          onClick={() => {

            editor
              .chain()
              .focus()
              .toggleCodeBlock()
              .run();

          }}

          className={
            isActive(
              'codeBlock'
            )
              ? 'active'
              : ''
          }
        >
          Code
        </button>


        {/* Image upload */}

        <input
          ref={
            imageInputRef
          }

          type="file"

          accept="image/png,image/jpeg,image/webp,image/gif"

          style={{
            display:
              'none',
          }}

          onChange={event => {

            const file =
              event.target.files?.[0];

            if (file) {

              uploadImage(
                file
              );

            }

          }}
        />


        <button
          type="button"

          disabled={
            isUploadingImage
          }

          onClick={() =>
            imageInputRef.current?.click()
          }
        >
          {isUploadingImage
            ? 'Uploading...'
            : '🖼 Image'}
        </button>


        <span
          className="toolbar-spacer"
        />


        {/* Undo */}

        <button
          type="button"

          onClick={() => {

            editor
              .chain()
              .focus()
              .undo()
              .run();

          }}

          disabled={
            !editor
              .can()
              .undo()
          }
        >
          ↶
        </button>


        {/* Redo */}

        <button
          type="button"

          onClick={() => {

            editor
              .chain()
              .focus()
              .redo()
              .run();

          }}

          disabled={
            !editor
              .can()
              .redo()
          }
        >
          ↷
        </button>


      </div>


      {/* =====================================================
          EDITOR BODY
      ====================================================== */}

      {imageSelected && (

        <div
          className="image-toolbar"

          style={{

            display:
              'flex',

            gap:
              '6px',

            flexWrap:
              'wrap',

            alignItems:
              'center',

            padding:
              '8px 10px',

            marginBottom:
              '8px',

            border:
              '1px solid #30363d',

            borderRadius:
              '8px',

            background:
              '#0d1117',

          }}
        >

          <span
            style={{
              fontSize:
                '12px',

              opacity:
                0.7,

              marginRight:
                '4px',
            }}
          >
            Image
          </span>


          {[
            '50%',
            '75%',
            '100%',
          ].map(
            width => (

              <button
                key={
                  width
                }

                type="button"

                onClick={() => {

                  editor
                    .chain()
                    .focus()
                    .updateAttributes(
                      'image',
                      {
                        width,
                      }
                    )
                    .run();

                }}
              >
                {width}
              </button>

            )
          )}


          <span
            style={{
              opacity:
                0.35,
            }}
          >
            |
          </span>


          {[
            [
              'left',
              '←',
            ],
            [
              'center',
              '↔',
            ],
            [
              'right',
              '→',
            ],
          ].map(
            ([
              align,
              label,
            ]) => (

              <button
                key={
                  align
                }

                type="button"

                title={
                  align
                }

                onClick={() => {

                  editor
                    .chain()
                    .focus()
                    .updateAttributes(
                      'image',
                      {
                        align,
                      }
                    )
                    .run();

                }}
              >
                {label}
              </button>

            )
          )}


          <button
            type="button"

            onClick={async () => {

              try {

                const {
                  src,
                } =
                  editor.getAttributes(
                    'image'
                  );


                if (!src) {

                  throw new Error(
                    '이미지 경로를 찾을 수 없어.'
                  );

                }


                const response =
                  await fetch(
                    src
                  );


                if (!response.ok) {

                  throw new Error(
                    '이미지를 불러오지 못했어.'
                  );

                }


                const originalBlob =
                  await response.blob();


                let clipboardBlob =
                  originalBlob;


                /*
                 * Clipboard API에서는 PNG가 가장 안정적이므로
                 * PNG가 아닌 이미지는 PNG로 변환한다.
                 */
                if (
                  originalBlob.type !==
                  'image/png'
                ) {

                  const bitmap =
                    await createImageBitmap(
                      originalBlob
                    );


                  const canvas =
                    document.createElement(
                      'canvas'
                    );


                  canvas.width =
                    bitmap.width;

                  canvas.height =
                    bitmap.height;


                  const context =
                    canvas.getContext(
                      '2d'
                    );


                  context.drawImage(
                    bitmap,
                    0,
                    0
                  );


                  clipboardBlob =
                    await new Promise(
                      (
                        resolve,
                        reject
                      ) => {

                        canvas.toBlob(
                          blob => {

                            if (blob) {

                              resolve(
                                blob
                              );

                            } else {

                              reject(
                                new Error(
                                  'PNG 변환 실패'
                                )
                              );

                            }

                          },
                          'image/png'
                        );

                      }
                    );

                }


                await navigator.clipboard.write([
                  new ClipboardItem({
                    'image/png':
                      clipboardBlob,
                  }),
                ]);


                window.alert(
                  '이미지를 복사했어. ChatGPT에서 Cmd+V 하면 돼.'
                );


              } catch (error) {

                console.error(
                  'Image copy failed:',
                  error
                );


                window.alert(
                  `이미지 복사 실패: ${
                    error?.message ||
                    'unknown error'
                  }`
                );

              }

            }}

            style={{
              marginLeft:
                'auto',
            }}
          >
            📋 이미지 복사
          </button>


          <button
            type="button"

            onClick={() => {

              editor
                .chain()
                .focus()
                .deleteSelection()
                .run();

            }}
          >
            Delete image
          </button>

        </div>

      )}


      <EditorContent
        editor={
          editor
        }
      />


    </div>
  );

}
