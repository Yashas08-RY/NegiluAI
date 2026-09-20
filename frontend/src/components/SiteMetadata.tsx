import { useEffect } from "react"

type SiteMetadataProps = {
  title: string
  description: string
  path?: string
}

const SITE_NAME = "ನೇಗಿಲುai"

export default function SiteMetadata({ title, description, path = "/" }: SiteMetadataProps) {
  useEffect(() => {
    const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`
    document.title = fullTitle

    const setMeta = (selector: string, attribute: "name" | "property", value: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(selector)
      if (!element) {
        element = document.createElement("meta")
        element.setAttribute(attribute, selector.includes("property=") ? selector.split('property="')[1].split('"')[0] : selector.split('name="')[1].split('"')[0])
        document.head.appendChild(element)
      }
      element.setAttribute(attribute, value)
    }

    setMeta('meta[name="description"]', "name", description)
    setMeta('meta[property="og:title"]', "property", fullTitle)
    setMeta('meta[property="og:description"]', "property", description)
    setMeta('meta[property="og:type"]', "property", "website")
    setMeta('meta[property="og:url"]', "property", `${window.location.origin}${path}`)
    setMeta('meta[property="og:image"]', "property", `${window.location.origin}/social-preview.svg`)
    setMeta('meta[name="twitter:card"]', "name", "summary_large_image")
    setMeta('meta[name="twitter:title"]', "name", fullTitle)
    setMeta('meta[name="twitter:description"]', "name", description)
    setMeta('meta[name="twitter:image"]', "name", `${window.location.origin}/social-preview.svg`)
  }, [description, path, title])

  return null
}
