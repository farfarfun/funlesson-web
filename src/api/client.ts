import type { CourseJob } from './types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(path, init)
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}))
    throw new Error(body.detail || `请求失败：${resp.status}`)
  }
  return resp.json() as Promise<T>
}

export function createCourse(url: string): Promise<CourseJob> {
  return request<CourseJob>('/api/courses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
}

export function getCourse(id: string): Promise<CourseJob> {
  return request<CourseJob>(`/api/courses/${id}`)
}

export function pptDownloadUrl(id: string): string {
  return `/api/courses/${id}/ppt`
}
