'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Link from '@tiptap/extension-link'
import { common, createLowlight } from 'lowlight'
import { useEffect, useCallback } from 'react'

const lowlight = createLowlight(common)

interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
}

export default function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // We use CodeBlockLowlight instead
        link: false, // We use Link extension with custom config
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class: 'text-primary-600 underline hover:text-primary-700',
        },
      }),
    ],
    content,
    immediatelyRender: false, // Disable SSR to avoid hydration mismatches
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] px-4 py-3',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  const setLink = useCallback(() => {
    if (!editor) return

    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL eingeben:', previousUrl)

    // cancelled
    if (url === null) {
      return
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    // update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  // Update editor content when prop changes
  useEffect(() => {
    if (!editor) return

    // Get current editor HTML and normalize both for comparison
    const currentContent = editor.getHTML()

    // TipTap can return different empty states
    const normalizedCurrent = ['<p></p>', '', '<p><br></p>', '<p><br/></p>'].includes(currentContent) ? '' : currentContent
    const normalizedNew = content || ''

    // Only update if content is actually different
    if (normalizedNew !== normalizedCurrent) {
      editor.commands.setContent(normalizedNew || '<p></p>')
    }
  }, [content, editor])

  // Cleanup editor on unmount
  useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy()
      }
    }
  }, [editor])

  if (!editor) {
    return null
  }

  return (
    <div className="border border-secondary-300 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-secondary-50 border-b border-secondary-300 p-2 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            editor.isActive('bold')
              ? 'bg-primary-600 text-white'
              : 'bg-white text-secondary-700 hover:bg-secondary-100'
          }`}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-3 py-1 rounded text-sm font-medium italic transition-colors ${
            editor.isActive('italic')
              ? 'bg-primary-600 text-white'
              : 'bg-white text-secondary-700 hover:bg-secondary-100'
          }`}
        >
          I
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`px-3 py-1 rounded text-sm font-medium line-through transition-colors ${
            editor.isActive('strike')
              ? 'bg-primary-600 text-white'
              : 'bg-white text-secondary-700 hover:bg-secondary-100'
          }`}
        >
          S
        </button>
        <button
          type="button"
          onClick={setLink}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            editor.isActive('link')
              ? 'bg-primary-600 text-white'
              : 'bg-white text-secondary-700 hover:bg-secondary-100'
          }`}
        >
          🔗
        </button>
        <div className="w-px bg-secondary-300 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            editor.isActive('heading', { level: 1 })
              ? 'bg-primary-600 text-white'
              : 'bg-white text-secondary-700 hover:bg-secondary-100'
          }`}
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            editor.isActive('heading', { level: 2 })
              ? 'bg-primary-600 text-white'
              : 'bg-white text-secondary-700 hover:bg-secondary-100'
          }`}
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            editor.isActive('heading', { level: 3 })
              ? 'bg-primary-600 text-white'
              : 'bg-white text-secondary-700 hover:bg-secondary-100'
          }`}
        >
          H3
        </button>
        <div className="w-px bg-secondary-300 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            editor.isActive('bulletList')
              ? 'bg-primary-600 text-white'
              : 'bg-white text-secondary-700 hover:bg-secondary-100'
          }`}
        >
          •
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            editor.isActive('orderedList')
              ? 'bg-primary-600 text-white'
              : 'bg-white text-secondary-700 hover:bg-secondary-100'
          }`}
        >
          1.
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`px-3 py-1 rounded text-sm font-medium font-mono transition-colors ${
            editor.isActive('codeBlock')
              ? 'bg-primary-600 text-white'
              : 'bg-white text-secondary-700 hover:bg-secondary-100'
          }`}
        >
          {'</>'}
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            editor.isActive('blockquote')
              ? 'bg-primary-600 text-white'
              : 'bg-white text-secondary-700 hover:bg-secondary-100'
          }`}
        >
          &quot;
        </button>
        <div className="w-px bg-secondary-300 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="px-3 py-1 rounded text-sm font-medium bg-white text-secondary-700 hover:bg-secondary-100"
        >
          —
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="px-3 py-1 rounded text-sm font-medium bg-white text-secondary-700 hover:bg-secondary-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ↶
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="px-3 py-1 rounded text-sm font-medium bg-white text-secondary-700 hover:bg-secondary-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ↷
        </button>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />

      {placeholder && !content && (
        <div className="absolute top-[52px] left-4 text-secondary-400 pointer-events-none">
          {placeholder}
        </div>
      )}
    </div>
  )
}
