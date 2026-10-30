"use client"

import { useEffect, useState } from "react"

import { flagEmoji } from "./dial-codes"
import { FloatingField } from "./floating-field"

type PhoneFieldProps = {
  id: string
  country: string
  value: string
  error?: string
  onChange: (value: string) => void
}

export function PhoneField({ id, country, value, error, onChange }: PhoneFieldProps) {
  const [flagFailed, setFlagFailed] = useState(false)
  const flag = flagEmoji(country)

  useEffect(() => {
    setFlagFailed(false)
  }, [country])

  const start = flag ? (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 left-3.5 flex h-[15px] w-5 -translate-y-1/2 items-center justify-center overflow-hidden rounded-[2px] text-sm leading-none"
    >
      {flagFailed ? (
        flag
      ) : (
        <img
          src={`https://flagcdn.com/40x30/${country.toLowerCase()}.png`}
          alt=""
          width={20}
          height={15}
          draggable={false}
          className="h-[15px] w-5 object-cover"
          onError={() => setFlagFailed(true)}
        />
      )}
    </span>
  ) : null

  return (
    <FloatingField
      id={id}
      label="Phone"
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      maxLength={32}
      value={value}
      error={error}
      onChange={onChange}
      start={start}
    />
  )
}
