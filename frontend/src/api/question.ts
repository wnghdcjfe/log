const API_BASE = '/api/v1/question'
const DEFAULT_USER_ID = 'default'

export interface QuestionRequest {
  userId?: string
  text: string
  searchSessionId?: string
}

export interface QuestionResponse {
  answer: string
  reasoningPath: {
    summary?: string
    records?: string[]
    graph_snapshot?: {
      node_count: number
      edge_count: number
    }
  }
  confidence: number
}

export async function askQuestion(text: string, userId: string = DEFAULT_USER_ID): Promise<QuestionResponse> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      text,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Failed to get answer')
  }

  return res.json()
}
