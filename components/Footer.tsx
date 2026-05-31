import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-zinc-200 mt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
        <span className="font-serif italic">Raúl Dubón</span>
        <div className="flex items-center gap-4">
          <span>© {new Date().getFullYear()} — Divulgación de reflexiones e ideas</span>
          <Link
            href="/donar"
            className="text-zinc-300 hover:text-amber-500 transition-colors"
            title="Apoya este proyecto"
          >
            ♥ Apoyar
          </Link>
        </div>
      </div>
    </footer>
  );
}
