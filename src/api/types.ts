export interface OutlineNode {
  title: string
  start: number | null
  children: OutlineNode[]
}

export interface Outline {
  title: string
  nodes: OutlineNode[]
}

export interface TranscriptSegment {
  start: number
  end: number
  text: string
}

export interface Transcript {
  full_text: string
  segments: TranscriptSegment[]
}

export interface DiagramSpec {
  title: string
  mermaid: string
}

export interface MediaInfo {
  url: string
  title: string
  duration: number | null
  cover: string | null
}

export interface CourseResult {
  media: MediaInfo
  transcript: Transcript
  outline: Outline
  mindmap: string
  diagrams: DiagramSpec[]
}

export type CourseStatus = 'pending' | 'running' | 'done' | 'failed'

export interface CourseJob {
  id: string
  url: string
  status: CourseStatus
  step: string | null
  progress: number | null
  error: string | null
  result?: CourseResult
}
