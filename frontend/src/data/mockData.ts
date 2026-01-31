/**
 * OUTBRAIN 목업 데이터
 * data1.json 기반 — 신규 간호사 일기 (태움, 번아웃, 직장 경험)
 */

export type NodeType = 'record' | 'person' | 'emotion' | 'event'
export type EmotionType =
  | '기쁨'
  | '슬픔'
  | '분노'
  | '불안'
  | '놀람'
  | '혼란'
  | '중립'
  | '번아웃'
  | '후회'
  | '무력감'
  | '피로'
  | '체념'

export interface RecordNode {
  id: string
  type: NodeType
  label: string
  timestamp: string // ISO date
  emotion?: EmotionType
  feel?: string[] // All emotions/feelings from the diary
  people?: string[]
  originalText: string
  importance?: number // 1-10, 중요도
  isExpanded?: boolean // 확장 탐색으로 추가된 노드
  expandType?: 'same_person' | 'same_emotion' | 'similar_event'
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  label?: string
  relationType?: 'involves' | 'shares_emotion' | 'similar_to' | 'references'
}

export interface TimelineEvent {
  id: string
  date: string
  label: string
  nodeIds: string[]
  summary: string
}

export interface SearchResult {
  query: string
  centralNodeId: string
  nodeIds: string[]
  edgeIds: string[]
}

export interface QuestionResult {
  questionId: string
  question: string
  nodeIds: string[]
  edgeIds: string[]
}

// ============ 노드 데이터 (data1.json 기반) ============
export const mockNodes: RecordNode[] = [
  {
    id: 'rec-1',
    type: 'record',
    label: '입사 2개월만에 대책없이 퇴사한 신규간호사썰',
    timestamp: '2025-12-23T22:00:00',
    emotion: '후회',
    people: ['프셉', '가족'],
    originalText: `입사 2개월만에 대책없이 퇴사한 썰을 풀어보겠습니다. 이제 후회를 동반한.

코로나 시기 졸예로 지방 대학병원에 합격했습니다. 다른 병원 원서를 단 한 장도 쓰지 않았어요. 당시 입사했던 병원은 태움이 없고 업무구분이 잘 되어있기로 소문난 병원이었어요.

내과 잡과에 배정되었는데 감염내과가 메인이라 septic 온 환자들이 다 저희 병동으로 입원하고, ICU에서 DNR 받고 내려오는 분도 흔했어요. 제 프셉은 군기반장(태움으로 유명한) 선생님이셨습니다.

하루에 4시간만 자고 전산공부, 약공부 했지만 똥군기 문화와 어마무시한 태움, 1NN만원 월급… 한달만에 12kg가 빠졌어요. 교수님이 입원하자고 해서 입원했고, 퇴원 후 복귀 전날 밤 옥상문까지 갔다가 정신을 차렸어요.

다시 자취방으로 돌아와 퇴사를 말하고 사직서를 썼어요. 가족과 상의 없이 결정했어요. 부모님은 반대했지만 저에겐 생존의 문제였어요. 퇴사와 동시에 후회가 밀려왔습니다.`,
    importance: 9,
  },
  {
    id: 'rec-2',
    type: 'record',
    label: '크리스마스이브엔 역시 이브닝',
    timestamp: '2025-12-25T20:00:00',
    emotion: '피로',
    people: ['간호사 친구'],
    originalText: `12월 23일부터 25일까지 연속 이브닝 근무가 배정되었고, 이틀 연속 신환 4명, 수술 환자, 퇴원 환자까지 모두 담당하게 되었다. 저녁 약 투약 이후 병동 업무가 밀려 실제 간호사실 복귀는 7시 50분이 되었으며, 환자 케어 도중 크리스마스 계획을 묻는 질문에 감정적으로 답한 뒤 스스로를 돌아보는 장면이 나온다.

퇴근 직전 추가 이벤트로 인해 1시간 이상 초과 근무를 했으나 시간외 신청은 하지 못했다. 작년과 달리 크리스마스 분위기는 전혀 없었고, 타 병원 근무 중인 간호사 친구와의 통화를 통해 서로의 고단함을 공유하며 위로를 얻는다. 크리스마스 당일에도 근무 예정이며, 개인적인 기대는 전혀 없는 상태로 업무의 안정만을 바라는 마음을 담고 있다.`,
    importance: 8,
  },
  {
    id: 'rec-3',
    type: 'record',
    label: '어느덧 3년차가 되어버렸다',
    timestamp: '2025-12-21T23:00:00',
    emotion: '번아웃',
    people: ['올드쌤'],
    originalText: `지옥같던 기졸 취업시즌을 지나 신규시절 울면서 출퇴근 하던 나날들을 뒤로하고, 고난과 역경을 넘지못해 진화한 3년차 (안)해피너스가 되어버렸다.

내년이면 차지도 봐야하고, 프셉도 해야하고, 4년차야. 난 아직 아무것도 모르는 신규 나부랭이인데.

오늘도 나이트하면서 올드쌤한테 혼나고, IV fail해서 환자한테 싹싹 빌고, 응급실 신환 받을 때 환파 안돼서 인계 못받고… 아, 더이상은 못해먹겠다. 퇴사를 하려거든 지금 해야겠다고 마음을 먹었지만 빚있어서 퇴사 못하죠?

100퍼센트 진심입니다. 저처럼 빚을 내세요. 그럼 절.대. 퇴사 못해요.

진짜 여기라도 안쓰면 홧병으로 죽을 것 같을 때 감정쓰레기통으로 포스팅할 예정. 제발 내년에 만나요 여러분.`,
    importance: 8,
  },
  {
    id: 'rec-4',
    type: 'record',
    label: '사람에 치인다는 것은',
    timestamp: '2026-01-08T23:00:00',
    emotion: '분노',
    people: ['올드쌤', '수쌤'],
    originalText: `5일 동안 예민한 환자 + 일안하는 상사들의 뒷턴을 받았습니다. 퇴사를 "못"해요 (빚 때문에). 하지만 일하면서 너무 현타가 와서 퇴사하고 싶었습니다.

IV site 괜찮은데 불편하다며 세시간동안 4번 바꾼 환자. 맞은편 환자 상태 안좋아서 급하게 처치하는데 본인 냉장고에서 당장 반찬 꺼내달라는 환자. 5일간 제 앞턴이 띠동갑 이상 차이나시는 선생님들, 엉덩이가 매우 무거우신 분들. 일을 안한다.

컨펌 받을게 산더미인데 컨펌 받은게 없고, 노티를 안하고 저한테 넘겨요. 검사 처방도 안하고, 카덱스에 정리 하나도 안해놨고. 본인 일 남한테 미루는게 직장내괴롭힘이지.

저 수쌤이랑 면담할 각오로 쌤들이 안한 거 다 찾아서 데스노트를 만들었어요. 3장 나오더라구요. 전 이제 참지않습니다. 정기면담할 때 올드들 일 안하는거 수쌤한테 다 말 할 예정입니다.`,
    importance: 9,
  },
  {
    id: 'rec-5',
    type: 'record',
    label: '직장에서 엉엉 운 사람이 되',
    timestamp: '2026-01-17T22:00:00',
    emotion: '슬픔',
    people: [],
    originalText: `일하면서 울었어요. 화장을 하고 가서 짤처럼 아이라인이 다 번져버린 대참사가 일어났습니다.

쌩신규 시절 태움과 갈굼을 당해도 절대로 병원에선 울지 않겠단 마인드를 장착한 자존심 쎈 사람입니다. 울고싶어도 꾹 참고 병원 문 밖을 나가자마자 울었지, 일하면서 우는건 진짜 이번이 처음이에요.

1월 중순인데 퇴사하고 싶으니까. 미쳐버린 중증도에 요즘들어 일이 너무 버거워요. 뭔가를 빠트리게 되는데 그럼 일하지 못한 저한테 화가나요. 처방도 헷갈리게 주고 환자 바이탈 흔들려서 노티했더니 소리지르면서 알아서 하라고 끊어버리고.

자존심 빼면 시체인 저는 라운딩 도는척 병실에서 소리없이 한참 울다 나왔어요. 9일동안 하루 쉬고 근무해서 체력도 멘탈도 나간 기분이에요. 그냥 생각없이 쉬고 싶어요.`,
    importance: 9,
  },
  // 확장 노드
  {
    id: 'rec-6',
    type: 'record',
    label: '신규 시절 첫 나이트',
    timestamp: '2025-11-15T02:00:00',
    emotion: '불안',
    people: ['프셉'],
    originalText: '첫 나이트 근무였다. 프셉님이 물품 위치 몰라서 꼽주시고, 전혀 모르는 걸 물어보면 "그걸 왜 몰라" 하시면서 인사도 안 받아주셨다. 하루 종일 쩔쩔맸다.',
    importance: 6,
    isExpanded: true,
    expandType: 'same_person',
  },
  {
    id: 'rec-7',
    type: 'record',
    label: '연차 쓴 하루',
    timestamp: '2025-12-10T14:00:00',
    emotion: '기쁨',
    people: [],
    originalText: '오랜만에 연차 썼다. 아무것도 안 하고 침대에서 뒹굴거리며 넷플릭스 봤다. 일 생각 안 하니까 머리가 시원했다. 이런 날이 왜 이렇게 적지.',
    importance: 5,
    isExpanded: true,
    expandType: 'similar_event',
  },
]

// ============ 간선 데이터 ============
export const mockEdges: GraphEdge[] = [
  { id: 'e1', source: 'rec-1', target: 'rec-3', relationType: 'similar_to', label: '퇴사 고민' },
  { id: 'e2', source: 'rec-1', target: 'rec-6', relationType: 'involves', label: '프셉/태움' },
  { id: 'e3', source: 'rec-2', target: 'rec-3', relationType: 'shares_emotion', label: '피로' },
  { id: 'e4', source: 'rec-3', target: 'rec-4', relationType: 'involves', label: '올드쌤' },
  { id: 'e5', source: 'rec-4', target: 'rec-5', relationType: 'similar_to', label: '한계' },
  { id: 'e6', source: 'rec-1', target: 'rec-5', relationType: 'shares_emotion', label: '울음' },
  { id: 'e7', source: 'rec-3', target: 'rec-5', relationType: 'shares_emotion', label: '번아웃' },
  { id: 'e8', source: 'rec-1', target: 'rec-7', relationType: 'similar_to', label: '휴식' },
]

// ============ 타임라인 이벤트 ============
export const mockTimelineEvents: TimelineEvent[] = [
  { id: 'tl-1', date: '2025-12-21', label: '3년차가 되어버림', nodeIds: ['rec-3'], summary: '번아웃, 빚 때문에 퇴사 못함' },
  { id: 'tl-2', date: '2025-12-23', label: '퇴사 썰', nodeIds: ['rec-1'], summary: '입사 2개월만 퇴사 후회' },
  { id: 'tl-3', date: '2025-12-25', label: '크리스마스 이브닝', nodeIds: ['rec-2'], summary: '연속 이브닝, 초과근무' },
  { id: 'tl-4', date: '2026-01-08', label: '사람에 치임', nodeIds: ['rec-4'], summary: '올드쌤 태움, 데스노트 작성' },
  { id: 'tl-5', date: '2026-01-17', label: '직장에서 울음', nodeIds: ['rec-5'], summary: '일하면서 처음 울었다' },
]

// ============ 검색 결과 (데모용) ============
export const mockSearchResults: SearchResult[] = [
  {
    query: '퇴사',
    centralNodeId: 'rec-1',
    nodeIds: ['rec-1', 'rec-3', 'rec-4'],
    edgeIds: ['e1', 'e4'],
  },
  {
    query: '태움',
    centralNodeId: 'rec-1',
    nodeIds: ['rec-1', 'rec-4', 'rec-6'],
    edgeIds: ['e2', 'e4'],
  },
  {
    query: '번아웃',
    centralNodeId: 'rec-3',
    nodeIds: ['rec-1', 'rec-2', 'rec-3', 'rec-5'],
    edgeIds: ['e3', 'e7'],
  },
  {
    query: '울었어',
    centralNodeId: 'rec-5',
    nodeIds: ['rec-1', 'rec-5'],
    edgeIds: ['e6'],
  },
  {
    query: '왜 그때 분위기가 안 좋았지',
    centralNodeId: 'rec-4',
    nodeIds: ['rec-4', 'rec-5'],
    edgeIds: ['e5'],
  },
]

// ============ 질문 결과 (데모용) ============
export const mockQuestionResults: QuestionResult[] = [
  {
    questionId: 'q1',
    question: '퇴사를 고민한 적은?',
    nodeIds: ['rec-1', 'rec-3', 'rec-4', 'rec-5'],
    edgeIds: ['e1', 'e4', 'e5'],
  },
  {
    questionId: 'q2',
    question: '태움이나 갈굼 경험',
    nodeIds: ['rec-1', 'rec-4', 'rec-6'],
    edgeIds: ['e2', 'e4'],
  },
  {
    questionId: 'q3',
    question: '번아웃·피로가 느껴진 순간들',
    nodeIds: ['rec-1', 'rec-2', 'rec-3', 'rec-5'],
    edgeIds: ['e3', 'e7'],
  },
]
