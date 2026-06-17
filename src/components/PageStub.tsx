/*
  Temporary placeholder for the five pages until each is built out.
  Keeps the look consistent so the navigation feels real while we work.
*/
export function PageStub({
  eyebrow,
  title,
  blurb,
}: {
  eyebrow: string;
  title: string;
  blurb: string;
}) {
  return (
    <section>
      <p className="text-sm uppercase tracking-[0.2em] text-ink-soft">
        {eyebrow}
      </p>
      <h1 className="mt-3 font-serif text-4xl leading-tight text-ink">
        {title}
      </h1>
      <p className="mt-4 max-w-md leading-relaxed text-ink-soft">{blurb}</p>
      <div className="mt-8 rounded-2xl border border-dashed border-line p-10 text-center text-sm text-ink-soft">
        Coming together soon.
      </div>
    </section>
  );
}
