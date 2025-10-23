import { redirect } from 'next/navigation';

export default function Home() {
  // TEMP: Auto-redirect to dashboard in demo mode
  redirect('/dashboard');

  const featureCards = [
    {
      title: "Spec-first delivery",
      description:
        "Every feature lives in Spec Kit with signed-off requirements, keeping engineering aligned with Deklaro’s compliance obligations.",
    },
    {
      title: "Security by default",
      description:
        "Row-level security, audit trails, and encrypted storage are accounted for from day one in the implementation plan.",
    },
    {
      title: "AI-assisted execution",
      description:
        "The Specify CLI orchestrates tasks across Codex, Claude, and more to ensure consistent automation output.",
    },
  ];

  return (
    <div className="container-responsive flex min-h-screen flex-col justify-between py-16">
      <main className="flex flex-col gap-12">
        <section className="flex flex-col gap-8 text-center lg:flex-row lg:items-center lg:justify-between lg:text-left">
          <div className="flex-1 space-y-6">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700">
              Multi-tenant invoice automation
            </span>
            <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
              Deklaro keeps Polish SMEs compliant and accountants in control
            </h1>
            <p className="max-w-2xl text-base text-slate-600 sm:text-lg">
              Upload invoices, validate company data, and submit to KSeF in a single flow. Built on
              Spec-Driven Development for predictable delivery and reliable automation.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href="/signup"
                className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                Activate Deklaro
              </a>
              <a
                href="/login"
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand-200 hover:text-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                Sign in to existing tenant
              </a>
            </div>
          </div>
          <div className="flex-1 rounded-xl border border-slate-200 bg-white p-6 shadow-card">
            <dl className="grid grid-cols-2 gap-6 text-left">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  OCR accuracy target
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-brand-600">95%</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Batch capacity</dt>
                <dd className="mt-1 text-3xl font-semibold text-brand-600">50 files</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">KSeF turnaround</dt>
                <dd className="mt-1 text-3xl font-semibold text-brand-600">&lt;5 min</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Tenants onboarded
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-brand-600">2000+</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="grid gap-6 rounded-xl border border-slate-200 bg-white p-8 shadow-card md:grid-cols-3">
          {featureCards.map((card) => (
            <article key={card.title} className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">{card.title}</h2>
              <p className="text-sm text-slate-600">{card.description}</p>
            </article>
          ))}
        </section>
      </main>

      <footer className="mt-12 flex flex-col items-center gap-2 border-t border-slate-200 pt-6 text-center text-xs text-slate-500 sm:flex-row sm:justify-between">
        <span>&copy; {new Date().getFullYear()} Deklaro. All rights reserved.</span>
        <div className="flex gap-4">
          <a href="#" className="hover:text-brand-600">
            Security posture
          </a>
          <a href="#" className="hover:text-brand-600">
            Engineering playbook
          </a>
        </div>
      </footer>
    </div>
  );
}
