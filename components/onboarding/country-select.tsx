"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"

import { cn } from "@/lib/utils"
import { countryOptions } from "./countries"

type CountrySelectProps = {
  id: string
  value: string
  error?: string
  onChange: (code: string) => void
}

export function CountrySelect({ id, value, error, onChange }: CountrySelectProps) {
  const options = useMemo(() => countryOptions(), [])
  const selected = options.find((country) => country.code === value)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listId = useId()

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return options
    return options.filter(
      (country) =>
        country.name.toLowerCase().includes(needle) ||
        country.code.toLowerCase().includes(needle),
    )
  }, [options, query])

  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onPointer)
    return () => document.removeEventListener("mousedown", onPointer)
  }, [open])

  useEffect(() => {
    if (open) searchRef.current?.focus()
  }, [open])

  useEffect(() => {
    setActive(0)
  }, [query])

  useEffect(() => {
    if (!open || filtered.length === 0) return
    document.getElementById(`${listId}-opt-${active}`)?.scrollIntoView({ block: "nearest" })
  }, [active, open, filtered.length, listId])

  function close(focusTrigger = true) {
    setOpen(false)
    setQuery("")
    if (focusTrigger) document.getElementById(id)?.focus()
  }

  function choose(code: string) {
    onChange(code)
    close()
  }

  function onSearchKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActive((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0)))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActive((index) => Math.max(index - 1, 0))
    } else if (event.key === "Enter") {
      event.preventDefault()
      const match = filtered[active]
      if (match) choose(match.code)
    } else if (event.key === "Escape") {
      event.preventDefault()
      close()
    }
  }

  const floated = open || Boolean(selected)
  const activeId = filtered[active] ? `${listId}-opt-${active}` : undefined

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
            event.preventDefault()
            setOpen(true)
          }
        }}
        className={cn(
          "h-12 w-full rounded-xl border bg-slate-950/70 px-3.5 pb-1 pt-5 text-left outline-none transition-[border-color,box-shadow] duration-200 sm:h-14 sm:pb-2 sm:pt-6",
          error
            ? "border-rose-400/80 shadow-[0_0_0_3px_rgba(244,63,94,0.16)]"
            : open
              ? "border-emerald-400 shadow-[0_0_0_3px_rgba(16,185,129,0.18),0_0_24px_rgba(16,185,129,0.14)]"
              : "border-slate-700/80 focus:border-emerald-400 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.18),0_0_24px_rgba(16,185,129,0.14)]",
        )}
      >
        <span className={cn("block truncate text-sm", selected ? "text-white" : "text-transparent")}>
          {selected?.name ?? "Country"}
        </span>
      </button>
      <span
        className={cn(
          "pointer-events-none absolute left-3.5 transition-all duration-200",
          floated ? "top-1.5 text-[11px] tracking-wide" : "top-1/2 -translate-y-1/2 text-sm",
          error ? "text-rose-300" : open ? "text-emerald-300" : "text-slate-400",
        )}
      >
        Country
      </span>

      {open && (
        <div className="absolute bottom-full left-0 right-0 z-30 mb-1 flex flex-col-reverse overflow-hidden rounded-xl border border-emerald-400/30 bg-slate-950/95 shadow-[0_16px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          <input
            ref={searchRef}
            value={query}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={activeId}
            aria-label="Search countries"
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onSearchKey}
            placeholder="Search countries"
            className="h-11 w-full border-t border-slate-800 bg-transparent px-3 text-sm text-white outline-none placeholder:text-slate-500"
          />
          <ul id={listId} role="listbox" aria-label="Countries" className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-500">No countries match.</li>
            ) : (
              filtered.map((country, index) => (
                <li
                  key={country.code}
                  id={`${listId}-opt-${index}`}
                  role="option"
                  aria-selected={country.code === value}
                >
                  <button
                    type="button"
                    onMouseEnter={() => setActive(index)}
                    onMouseDown={(event) => {
                      event.preventDefault()
                      choose(country.code)
                    }}
                    className={cn(
                      "flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-200",
                      index === active && "bg-emerald-500/15 text-white",
                    )}
                  >
                    <span>{country.name}</span>
                    <span className="text-xs text-slate-500">{country.code}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      {error && (
        <p id={`${id}-error`} className="mt-1 text-[11px] leading-tight text-rose-300">
          {error}
        </p>
      )}
    </div>
  )
}
