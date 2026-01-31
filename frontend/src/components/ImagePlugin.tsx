import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $insertNodes, COMMAND_PRIORITY_EDITOR, createCommand, LexicalCommand } from 'lexical'
import { useEffect } from 'react'
import { $createImageNode } from '../nodes/ImageNode'

export const INSERT_IMAGE_COMMAND: LexicalCommand<{ src: string; altText?: string }> = createCommand(
  'INSERT_IMAGE_COMMAND'
)

const MAX_IMAGE_SIZE = 1024 * 1024 * 2 // 2MB

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error(`지원하지 않는 형식입니다: ${file.type}`))
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      reject(new Error('이미지 크기는 2MB 이하여야 합니다.'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function ImagePlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    return editor.registerCommand(
      INSERT_IMAGE_COMMAND,
      (payload) => {
        const imageNode = $createImageNode({
          src: payload.src,
          altText: payload.altText ?? '',
        })
        $insertNodes([imageNode])
        return true
      },
      COMMAND_PRIORITY_EDITOR
    )
  }, [editor])

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          if (file) {
            fileToDataUrl(file)
              .then((src) => {
                editor.update(() => {
                  $insertNodes([$createImageNode({ src, altText: file.name })])
                })
              })
              .catch(console.warn)
          }
          return
        }
      }
    }

    const el = editor.getRootElement()
    el?.addEventListener('paste', handlePaste)
    return () => el?.removeEventListener('paste', handlePaste)
  }, [editor])

  return null
}
