"use client";

import { useState } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

// Splits a list into pages. `page` is kept inside the valid range even when the list shrinks.
export function usePagination<T>(items: T[], pageSize: number) {
  const [requested, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(1, requested), pageCount);
  const slice = items.slice((page - 1) * pageSize, page * pageSize);
  return { page, setPage, pageCount, slice };
}

// 1 … 4 5 6 … 12  (always shows first, last and the neighbours of the current page)
function pageNumbers(page: number, count: number): (number | "gap-left" | "gap-right")[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const out: (number | "gap-left" | "gap-right")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(count - 1, page + 1);
  if (start > 2) out.push("gap-left");
  for (let n = start; n <= end; n++) out.push(n);
  if (end < count - 1) out.push("gap-right");
  out.push(count);
  return out;
}

export default function PageBar({ page, pageCount, onChange }: { page: number; pageCount: number; onChange: (p: number) => void }) {
  if (pageCount <= 1) return null;
  return (
    <Pagination className="mt-4">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious disabled={page === 1} onClick={() => onChange(page - 1)} />
        </PaginationItem>
        {pageNumbers(page, pageCount).map((n) =>
          typeof n === "number" ? (
            <PaginationItem key={n}>
              <PaginationLink isActive={n === page} onClick={() => onChange(n)} aria-label={`Page ${n}`}>
                {n}
              </PaginationLink>
            </PaginationItem>
          ) : (
            <PaginationItem key={n}>
              <PaginationEllipsis />
            </PaginationItem>
          )
        )}
        <PaginationItem>
          <PaginationNext disabled={page === pageCount} onClick={() => onChange(page + 1)} />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}