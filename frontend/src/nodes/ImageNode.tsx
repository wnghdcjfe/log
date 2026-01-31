import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical'
import { $applyNodeReplacement, DecoratorNode } from 'lexical'

export interface ImagePayload {
  altText?: string
  key?: NodeKey
  src: string
  title?: string
  width?: number
  height?: number
}

export type SerializedImageNode = Spread<
  {
    altText: string
    height?: number
    src: string
    title?: string
    width?: number
  },
  SerializedLexicalNode
>

function convertImageElement(domNode: Node): null | DOMConversionOutput {
  if (domNode instanceof HTMLImageElement) {
    const img = domNode
    const src = img.getAttribute('src')
    if (src) {
      const node = $createImageNode({ altText: img.alt ?? '', src, title: img.title ?? undefined })
      return { node }
    }
  }
  return null
}

export class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string
  __altText: string
  __title: string
  __width: 'inherit' | number
  __height: 'inherit' | number

  static getType(): string {
    return 'image'
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(
      node.__src,
      node.__altText,
      node.__title,
      node.__width,
      node.__height,
      node.__key
    )
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    const { altText, height, width, src, title } = serializedNode
    return $createImageNode({
      altText,
      height,
      src,
      title,
      width,
    })
  }

  static importDOM(): DOMConversionMap | null {
    return {
      img: () => ({
        conversion: convertImageElement,
        priority: 0,
      }),
    }
  }

  constructor(
    src: string,
    altText = '',
    title = '',
    width: 'inherit' | number = 'inherit',
    height: 'inherit' | number = 'inherit',
    key?: NodeKey
  ) {
    super(key)
    this.__src = src
    this.__altText = altText
    this.__title = title
    this.__width = width
    this.__height = height
  }

  exportDOM(): DOMExportOutput {
    const img = document.createElement('img')
    img.setAttribute('src', this.__src)
    img.setAttribute('alt', this.__altText)
    if (this.__title) img.setAttribute('title', this.__title)
    if (this.__width !== 'inherit') img.setAttribute('width', String(this.__width))
    if (this.__height !== 'inherit') img.setAttribute('height', String(this.__height))
    return { element: img }
  }

  exportJSON(): SerializedImageNode {
    return {
      ...super.exportJSON(),
      altText: this.__altText,
      height: this.__height === 'inherit' ? undefined : this.__height,
      src: this.__src,
      title: this.__title || undefined,
      width: this.__width === 'inherit' ? undefined : this.__width,
    }
  }

  setWidthAndHeight(width: 'inherit' | number, height: 'inherit' | number): this {
    const writable = this.getWritable()
    writable.__width = width
    writable.__height = height
    return writable
  }

  decorate(_editor: LexicalEditor, _config: EditorConfig): JSX.Element {
    return (
      <img
        src={this.__src}
        alt={this.__altText}
        title={this.__title || undefined}
        style={{
          maxWidth: '100%',
          height: this.__height === 'inherit' ? 'auto' : `${this.__height}px`,
          width: this.__width === 'inherit' ? '100%' : `${this.__width}px`,
          objectFit: 'contain',
          borderRadius: 8,
        }}
        draggable="false"
      />
    )
  }

  getSrc(): string {
    return this.__src
  }

  getAltText(): string {
    return this.__altText
  }
}

export function $createImageNode(payload: ImagePayload): ImageNode {
  return $applyNodeReplacement(
    new ImageNode(
      payload.src,
      payload.altText ?? '',
      payload.title ?? '',
      payload.width ?? 'inherit',
      payload.height ?? 'inherit',
      payload.key
    )
  )
}

export function $isImageNode(node: LexicalNode | null | undefined): node is ImageNode {
  return node instanceof ImageNode
}
