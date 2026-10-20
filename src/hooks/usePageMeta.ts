import { useEffect } from 'react'

const SITE_NAME = 'BC Kellendonck'

/** Sets a unique document title and meta description per page. */
export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    document.title = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`

    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'description'
      document.head.appendChild(meta)
    }
    meta.content = description
  }, [title, description])
}
