import { useCallback, useEffect, useRef, useState } from 'react'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
} from 'lexical'
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from '@lexical/list'
import { $generateHtmlFromNodes } from '@lexical/html'
import { ListNode, ListItemNode } from '@lexical/list'
import { LinkNode } from '@lexical/link'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { Bold, Italic, Underline, Strikethrough, List, ListOrdered, Undo2, Redo2 } from 'lucide-react'
import { ImageNode } from '../nodes/ImageNode'
import { ImagePlugin, INSERT_IMAGE_COMMAND, fileToDataUrl } from './ImagePlugin'

const theme = {
  paragraph: 'mb-2',
  list: {
    ul: 'list-disc pl-6 mb-2',
    ol: 'list-decimal pl-6 mb-2',
    listitem: 'ml-2',
  },
  link: 'text-[#FFB6A3] underline hover:text-[#e89580]',
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
  },
}

function onError(error: Error) {
  console.error('Lexical error:', error)
}

const initialNodes = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  LinkNode,
  ImageNode,
]

const ALLOWED_IMAGE_TYPES = 'image/jpeg,image/png,image/gif,image/webp'

function ToolbarPlugin({ contentBgColor = '#FFF9F5' }: { contentBgColor?: string }) {
  const [editor] = useLexicalComposerContext()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [isStrikethrough, setIsStrikethrough] = useState(false)

  const updateToolbar = useCallback(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat('bold'))
      setIsItalic(selection.hasFormat('italic'))
      setIsUnderline(selection.hasFormat('underline'))
      setIsStrikethrough(selection.hasFormat('strikethrough'))
    }
  }, [editor])

  useEffect(() => {
    return editor.registerUpdateListener(() => updateToolbar())
  }, [editor, updateToolbar])

  const format = (value: 'bold' | 'italic' | 'underline' | 'strikethrough') => () => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, value)
  }

  const insertList = (type: 'bullet' | 'number') => () => {
    editor.dispatchCommand(type === 'bullet' ? INSERT_UNORDERED_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND, undefined)
  }

  const btn = 'p-2 rounded-lg transition-colors hover:bg-[#ffb6a3]/20'
  const btnActive = 'bg-[#ffb6a3]/30'
  const toolbarBorder = contentBgColor === '#ffffff' ? '#e7ddda' : '#FFDAB9'
  const toolbarBg = contentBgColor === '#ffffff' ? 'rgba(255, 182, 163, 0.08)' : 'rgba(255, 218, 185, 0.2)'

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b" style={{ borderColor: toolbarBorder, backgroundColor: toolbarBg }}>
      <button type="button" onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)} className={btn} title="실행 취소">
        <Undo2 className="w-4 h-4" style={{ color: '#8b6355' }} />
      </button>
      <button type="button" onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)} className={btn} title="다시 실행">
        <Redo2 className="w-4 h-4" style={{ color: '#8b6355' }} />
      </button>
      <span className="w-px h-6 bg-[#FFDAB9]/50 self-center mx-1" />
      <button type="button" onClick={format('bold')} className={`${btn} ${isBold ? btnActive : ''}`} title="굵게">
        <Bold className="w-4 h-4" style={{ color: '#8b6355' }} />
      </button>
      <button type="button" onClick={format('italic')} className={`${btn} ${isItalic ? btnActive : ''}`} title="기울임">
        <Italic className="w-4 h-4" style={{ color: '#8b6355' }} />
      </button>
      <button type="button" onClick={format('underline')} className={`${btn} ${isUnderline ? btnActive : ''}`} title="밑줄">
        <Underline className="w-4 h-4" style={{ color: '#8b6355' }} />
      </button>
      <button type="button" onClick={format('strikethrough')} className={`${btn} ${isStrikethrough ? btnActive : ''}`} title="취소선">
        <Strikethrough className="w-4 h-4" style={{ color: '#8b6355' }} />
      </button>
      <span className="w-px h-6 bg-[#FFDAB9]/50 self-center mx-1" />
      <button type="button" onClick={insertList('bullet')} className={btn} title="글머리 기호">
        <List className="w-4 h-4" style={{ color: '#8b6355' }} />
      </button>
      <button type="button" onClick={insertList('number')} className={btn} title="번호 매기기">
        <ListOrdered className="w-4 h-4" style={{ color: '#8b6355' }} />
      </button>
      <span className="w-px h-6 bg-[#FFDAB9]/50 self-center mx-1" />
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_IMAGE_TYPES}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (!file) return
          fileToDataUrl(file)
            .then((src) => {
              editor.dispatchCommand(INSERT_IMAGE_COMMAND, { src, altText: file.name })
            })
            .catch((err) => alert(err instanceof Error ? err.message : '이미지 업로드 실패'))
          e.target.value = ''
        }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className={btn}
        title="이미지 삽입"
      >
        <span className="material-symbols-outlined text-[20px]" style={{ color: '#8b6355' }}>
          image
        </span>
      </button>
    </div>
  )
}

interface DiaryEditorProps {
  onChange: (html: string, plainText: string) => void
  placeholder?: string
  minHeight?: string
  contentBgColor?: string
  contentTextColor?: string
}

export function DiaryEditor({
  onChange: onChangeProp,
  placeholder = '오늘 무슨 일이 있었나요?',
  minHeight = '200px',
  contentBgColor = '#FFF9F5',
  contentTextColor = '#181210',
}: DiaryEditorProps) {
  const initialConfig = {
    namespace: 'DiaryEditor',
    theme,
    nodes: initialNodes,
    onError,
    editable: true,
  }

  const handleChange = useCallback(
    (
      _editorState: import('lexical').EditorState,
      editor: import('lexical').LexicalEditor
    ) => {
      editor.getEditorState().read(() => {
        const root = $getRoot()
        const plainText = root.getTextContent()
        const html = $generateHtmlFromNodes(editor, null)
        onChangeProp(html, plainText)
      })
    },
    [onChangeProp]
  )

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <ToolbarPlugin contentBgColor={contentBgColor} />
      <ImagePlugin />
      <div className="relative">
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className="outline-none min-w-0 w-full px-4 py-3 resize-y"
              style={{
                minHeight,
                color: contentTextColor,
                backgroundColor: contentBgColor,
              }}
              aria-placeholder={placeholder}
              placeholder={
                <div style={{ color: contentTextColor === '#181210' ? 'rgba(141, 103, 94, 0.6)' : 'rgba(139, 99, 85, 0.5)' }}>
                  {placeholder}
                </div>
              }
            />
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
      </div>
      <ListPlugin />
      <LinkPlugin />
      <HistoryPlugin />
      <AutoFocusPlugin />
      <OnChangePlugin
        onChange={(editorState, editor) => handleChange(editorState, editor)}
      />
    </LexicalComposer>
  )
}
