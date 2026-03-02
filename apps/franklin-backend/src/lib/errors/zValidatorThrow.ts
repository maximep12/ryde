// This is a wrapper for the zod validator shipped with Hono
// Its default behavior is to return a Response with a 400 status code
// when validation fails. We want to throw an HTTPException instead.
// That way, onError() acts as a global error handler.

import { zValidator } from '@hono/zod-validator'
import { Context, ValidationTargets } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { ZodTypeAny } from 'zod'

const TARGET_MESSAGE_MAP = {
  json: 'JSON',
  form: 'Form',
  query: 'Query params',
  param: 'URL Params',
  header: 'Header',
  cookie: 'Cookie',
}

export const zValidatorThrow = <T extends ZodTypeAny, Target extends keyof ValidationTargets>(
  target: Target,
  schema: T,
  hook?: (zodResult: ReturnType<T['safeParse']>, c: Context) => unknown,
) => {
  return zValidator(target, schema, async (result, c: Context) => {
    if (!result.success) {
      // Transform ZodError into HTTPException with issues for frontend translation
      c.set('issues', result.error.issues)

      const res = new Response(
        JSON.stringify({
          message: `Validation failed (${TARGET_MESSAGE_MAP[target]})`,
          issues: result.error.issues,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )

      throw new HTTPException(400, { res })
    }

    if (hook) await hook(result as ReturnType<T['safeParse']>, c)
  })
}
