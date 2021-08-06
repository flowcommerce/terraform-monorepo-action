import { context, getOctokit } from '@actions/github'
import {
  PullRequestEvent,
  PushEvent,
  WorkflowDispatchEvent,
} from '@octokit/webhooks-types'

export async function getSha(
  token: string,
): Promise<{ head: string; base: string }> {
  const octokit = getOctokit(token)

  let base: string | undefined
  let head: string | undefined

  switch (context.eventName) {
    case 'pull_request': {
      const payload = context.payload as PullRequestEvent
      base = payload.pull_request?.base?.sha
      head = payload.pull_request?.head?.sha
      break
    }
    case 'push': {
      const payload = context.payload as PushEvent
      base = payload.before
      head = payload.after
      break
    }
    case 'workflow_dispatch': {
      const payload = context.payload as WorkflowDispatchEvent

      const ref = await octokit.rest.git.getRef({
        owner: context.repo.owner,
        repo: context.repo.repo,
        ref: payload.ref,
      })

      const commit = await octokit.rest.git.getCommit({
        owner: context.repo.owner,
        repo: context.repo.repo,
        commit_sha: ref.data.object.sha,
      })

      base = commit.data.parents[0].sha
      head = commit.data.sha
      break
    }
    default:
      throw new Error(`Unsupported event: ${context.eventName}`)
  }

  if (!base || !head) {
    throw new Error('Refs not found')
  }

  return { base, head }
}

export function getModulePaths<T extends Record<string, unknown>>(
  files: T[] | undefined,
  pathProp: keyof T,
): string[] {
  const result = files?.reduce<string[]>((paths, file) => {
    const path = file[pathProp] as string
    if (path.endsWith('.tf')) {
      paths.push(path.substring(0, path.lastIndexOf('/')))
    }
    return paths
  }, [])
  return Array.from(new Set(result))
}
