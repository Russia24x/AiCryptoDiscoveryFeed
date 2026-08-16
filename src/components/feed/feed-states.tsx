export function FeedSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] overflow-hidden"
        >
          <div className="aspect-[16/9] shimmer" />
          <div className="p-4 flex flex-col gap-2">
            <div className="h-4 w-3/4 shimmer rounded" />
            <div className="h-3 w-full shimmer rounded" />
            <div className="h-3 w-1/2 shimmer rounded mt-2" />
            <div className="mt-4 h-3 w-1/3 shimmer rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FeedEmpty({ query }: { query?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--brand-border)] bg-[var(--brand-surface)]/40 py-16 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-[var(--brand-surface-2)] flex items-center justify-center mb-4">
        <span className="font-latin text-[var(--brand-muted)] text-lg">∅</span>
      </div>
      <p className="text-sm font-medium text-[var(--brand-text)]">
        {query ? "نتیجه‌ای یافت نشد" : "محتوایی در دسترس نیست"}
      </p>
      <p className="text-xs text-[var(--brand-muted)] mt-1">
        {query
          ? "عبارت دیگری را امتحان کنید یا فیلتر را تغییر دهید."
          : "لطفاً چند لحظه صبر کنید و دوباره تلاش کنید."}
      </p>
    </div>
  );
}

export function FeedError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/5 py-12 text-center px-4">
      <p className="text-sm font-medium text-red-300">خطا در دریافت محتوا</p>
      <p className="text-xs text-[var(--brand-muted)] mt-1 mb-4">
        ارتباط با منابع با مشکل مواجه شد. ممکن است محدودیت نرخ درخواست اعمال شده باشد.
      </p>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-md bg-[var(--brand-accent)] text-[#04201d] text-xs font-bold hover:brightness-110"
      >
        تلاش مجدد
      </button>
    </div>
  );
}
