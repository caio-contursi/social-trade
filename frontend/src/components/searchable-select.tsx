"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SearchableOption {
  value: string;
  label: string;
  keywords?: string;
}

export function SearchableSelect({
  id,
  label,
  value,
  options,
  placeholder,
  searchPlaceholder,
  disabled = false,
  onValueChange,
}: {
  id: string;
  label: string;
  value: string;
  options: SearchableOption[];
  placeholder: string;
  searchPlaceholder: string;
  disabled?: boolean;
  onValueChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listId = useId();
  const selected = options.find((option) => option.value === value);
  const filtered = useMemo(() => {
    const normalizedQuery = normalize(query.trim());
    return options
      .filter((option) =>
        normalize(`${option.label} ${option.keywords || ""}`).includes(normalizedQuery),
      );
  }, [options, query]);
  const optionCount = filtered.length + 1;
  const selectedFilteredIndex = selected ? filtered.findIndex((option) => option.value === selected.value) + 1 : 0;

  useEffect(() => {
    if (!open) return;
    document.getElementById(`${listId}-option-${activeIndex}`)?.scrollIntoView?.({ block: "nearest" });
  }, [activeIndex, listId, open]);

  function choose(option: SearchableOption) {
    onValueChange(option.value);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative min-w-0">
      <label htmlFor={id} className="mb-2 block text-xs text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          id={id}
          role="combobox"
          aria-label={label}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={open ? `${listId}-option-${activeIndex}` : undefined}
          autoComplete="off"
          disabled={disabled}
          value={open ? query : selected?.label || ""}
          placeholder={disabled ? "Escolha um estado primeiro" : open ? searchPlaceholder : placeholder}
          onFocus={() => {
            setQuery("");
            setActiveIndex(Math.max(0, selectedFilteredIndex));
            setOpen(true);
          }}
          onClick={() => {
            setQuery("");
            setActiveIndex(Math.max(0, selectedFilteredIndex));
            setOpen(true);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              setQuery("");
            } else if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((index) => Math.min(open ? index + 1 : Math.max(1, selectedFilteredIndex), optionCount - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((index) => Math.max(open ? index - 1 : selectedFilteredIndex, 0));
            } else if (event.key === "Enter" && open) {
              event.preventDefault();
              if (activeIndex === 0) choose({ value: "", label: placeholder });
              else if (filtered[activeIndex - 1]) choose(filtered[activeIndex - 1]);
            }
          }}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          className="h-10 rounded-full bg-background pr-10 pl-10"
        />
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      </div>
      {open && !disabled && (
        <div
          id={listId}
          role="listbox"
          aria-label={`Opções de ${label.toLocaleLowerCase("pt-BR")}`}
          className="absolute top-full z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border bg-popover p-1.5 text-popover-foreground shadow-lg"
        >
          <button
            id={`${listId}-option-0`}
            type="button"
            role="option"
            aria-selected={!value}
            data-active={activeIndex === 0}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => choose({ value: "", label: placeholder })}
            onMouseEnter={() => setActiveIndex(0)}
            className="searchable-option flex min-h-10 w-full items-center justify-between rounded-xl px-3 text-left text-sm hover:bg-accent"
          >
            {placeholder}
            {!value && <Check className="size-4 text-primary" aria-hidden="true" />}
          </button>
          {filtered.map((option, index) => (
            <button
              id={`${listId}-option-${index + 1}`}
              type="button"
              role="option"
              aria-selected={value === option.value}
              data-active={activeIndex === index + 1}
              key={option.value}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option)}
              onMouseEnter={() => setActiveIndex(index + 1)}
              className={cn(
                "searchable-option flex min-h-10 w-full items-center justify-between gap-2 rounded-xl px-3 text-left text-sm hover:bg-accent",
                value === option.value && "font-semibold text-primary",
              )}
            >
              <span className="truncate">{option.label}</span>
              {value === option.value && <Check className="size-4 shrink-0" aria-hidden="true" />}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              Nenhuma opção encontrada.
            </p>
          )}
        </div>
      )}
      <span className="sr-only" aria-live="polite">
        {open ? `${filtered.length} opções disponíveis` : ""}
      </span>
    </div>
  );
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}
