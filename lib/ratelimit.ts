import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// 15 requests per minute per IP across both API routes
export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(15, '1 m'),
  analytics: true,
  prefix: 'kira-kira',
})

export function getIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'anonymous'
  )
}
