"use client"

import Image from "next/image"
import { useState } from "react"

import { avatarSrc, DEFAULT_AVATAR_SRC } from "@/lib/avatar"

export function UserAvatar({
  url,
  name,
  className = "size-10",
}: {
  url: string | null
  name: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const src = failed ? DEFAULT_AVATAR_SRC : avatarSrc(url)
  const remote = src.startsWith("http://") || src.startsWith("https://") || src.startsWith("/api/")
  const alt = name ? `${name} avatar` : "Account"
  const classNames = `${className} rounded-full border border-white/10 object-cover`
  if (remote) {
    return (
      // Remote files and the Telegram avatar route are served directly. The optimizer only handles the local placeholder.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        width={40}
        height={40}
        className={classNames}
        onError={() => setFailed(true)}
      />
    )
  }
  return <Image src={src} alt={alt} width={40} height={40} className={classNames} />
}
