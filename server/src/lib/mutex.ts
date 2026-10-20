const chains = new Map<string, Promise<unknown>>()

/** Runs `fn` after all earlier calls with the same name have finished. */
export function withLock<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const previous = chains.get(name) ?? Promise.resolve()
  const next = previous.catch(() => undefined).then(fn)
  chains.set(name, next)
  next.finally(() => {
    if (chains.get(name) === next) chains.delete(name)
  }).catch(() => undefined)
  return next
}
