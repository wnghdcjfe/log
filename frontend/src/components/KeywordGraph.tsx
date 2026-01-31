import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import type { RecordNode } from '@/data/mockData'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface GraphNode {
  id: string
  kind: 'keyword' | 'diary'
  label: string
  diary?: RecordNode
  match: boolean
  x?: number
  y?: number
  fx?: number
  fy?: number
}

interface KeywordGraphProps {
  query: string
  nodes: RecordNode[]
  matchedNodeIds: string[]
  onlyMatches: boolean
  onNodeSelect: (node: RecordNode | null) => void
}

export function KeywordGraph({
  query,
  nodes,
  matchedNodeIds,
  onlyMatches,
  onNodeSelect,
}: KeywordGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const svgEl = svgRef.current
    const tipEl = tooltipRef.current
    if (!svgEl) return

    const displayNodes = onlyMatches
      ? nodes.filter((n) => matchedNodeIds.includes(n.id))
      : nodes

    const kwLabel = query.trim() ? `#${query.trim()}` : '#전체'
    const keywordId = query.trim() ? `kw:${query.trim()}` : 'kw:all'

    const graphNodes: GraphNode[] = [
      { id: keywordId, kind: 'keyword', label: kwLabel, match: true },
      ...displayNodes.map((d) => ({
        id: d.id,
        kind: 'diary' as const,
        label: `${format(new Date(d.timestamp), 'yyyy-MM-dd', { locale: ko })}\n${d.label}`,
        diary: d,
        match: matchedNodeIds.includes(d.id),
      })),
    ]

    const links = graphNodes
      .filter((n) => n.kind === 'diary')
      .map((n) => ({ source: keywordId, target: n.id }))

    const rect = svgEl.getBoundingClientRect()
    const w = Math.max(520, Math.floor(rect.width))
    const h = 520

    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${w} ${h}`)

    const g = svg.append('g')

    svg.call(
      d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.6, 2])
        .on('zoom', (ev) => {
          g.attr('transform', ev.transform)
        })
    )

    const linkData = links.map((l) => ({
      source: graphNodes.find((n) => n.id === l.source)!,
      target: graphNodes.find((n) => n.id === l.target)!,
    }))

    const sim = d3
      .forceSimulation<GraphNode>(graphNodes)
      .force(
        'link',
        d3.forceLink<GraphNode, { source: GraphNode; target: GraphNode }>(linkData)
          .id((d) => d.id)
          .distance(170)
          .strength(0.9)
      )
      .force('charge', d3.forceManyBody().strength(-650))
      .force('center', d3.forceCenter(w / 2, h / 2))
      .force(
        'collide',
        d3.forceCollide<GraphNode>().radius((d) => (d.kind === 'keyword' ? 46 : 62))
      )

    const link = g
      .append('g')
      .attr('stroke', '#FFB6A3')
      .attr('stroke-opacity', 0.5)
      .selectAll<SVGLineElement, { source: GraphNode; target: GraphNode }>('line')
      .data(linkData)
      .enter()
      .append('line')
      .attr('stroke-width', 1.5)

    const node = g
      .append('g')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(graphNodes)
      .enter()
      .append('g')
      .style('cursor', 'pointer')

    node
      .append('circle')
      .attr('r', (d) => (d.kind === 'keyword' ? 36 : 44))
      .attr('fill', (d) =>
        d.kind === 'keyword' ? '#8b6355' : d.match ? '#FFB6A3' : '#FFDAB9'
      )
      .attr('opacity', 0.95)

    node
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', (d) => (d.kind === 'keyword' ? 14 : 11))
      .attr('font-weight', 700)
      .each(function (this: SVGTextElement, d) {
        const lines = String(d.label).split('\n')
        const text = d3.select(this)
        const dy0 = -(lines.length - 1) * 7
        lines.slice(0, 3).forEach((line, i) => {
          text
            .append('tspan')
            .attr('x', 0)
            .attr('dy', i === 0 ? dy0 : 14)
            .text(line.length > 18 ? line.slice(0, 18) + '…' : line)
        })
      })

    node.call(
      d3
        .drag<SVGGElement, GraphNode>()
        .on('start', (ev, d) => {
          if (!ev.active) sim.alphaTarget(0.25).restart()
          d.fx = d.x
          d.fy = d.y
        })
        .on('drag', (ev, d) => {
          d.fx = ev.x
          d.fy = ev.y
        })
        .on('end', (ev, d) => {
          if (!ev.active) sim.alphaTarget(0)
          d.fx = undefined
          d.fy = undefined
        })
    )

    node
      .on('mousemove', (ev, d) => {
        if (d.kind === 'diary' && d.diary && tipEl) {
          tipEl.style.left = `${ev.clientX}px`
          tipEl.style.top = `${ev.clientY}px`
          tipEl.textContent = `${format(new Date(d.diary.timestamp), 'yyyy-MM-dd', { locale: ko })}\n${d.diary.label}\n${d.diary.emotion ?? ''} ${(d.diary.people ?? []).join(', ')}`
          tipEl.style.opacity = '1'
        } else if (tipEl) {
          tipEl.style.opacity = '0'
        }
      })
      .on('mouseleave', () => {
        if (tipEl) tipEl.style.opacity = '0'
      })
      .on('click', (ev, d) => {
        ev.stopPropagation()
        if (d.kind === 'diary' && d.diary) {
          onNodeSelect(d.diary)
        } else {
          onNodeSelect(null)
        }
      })

    svg.on('click', () => onNodeSelect(null))

    sim.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x ?? 0)
        .attr('y1', (d) => d.source.y ?? 0)
        .attr('x2', (d) => d.target.x ?? 0)
        .attr('y2', (d) => d.target.y ?? 0)
      node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })

    return () => {
      sim.stop()
    }
  }, [query, nodes, matchedNodeIds, onlyMatches, onNodeSelect])

  return (
    <div className="relative w-full" style={{ backgroundColor: '#FFF9F5' }}>
      <svg
        ref={svgRef}
        className="w-full block"
        style={{ height: 520 }}
        aria-label="keyword graph"
      />
      <div
        ref={tooltipRef}
        className="fixed pointer-events-none text-white py-2 px-2.5 rounded-lg text-xs leading-snug max-w-[280px] -translate-x-1/2 -translate-y-[120%] opacity-0 transition-opacity z-50 whitespace-pre-wrap"
        style={{ backgroundColor: 'rgba(139, 99, 85, 0.95)' }}
      />
    </div>
  )
}
