export default function Footer() {
  return (
    <footer className="bg-white border-t border-zinc-200 mt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-400">
        <span className="font-serif italic">Mis Ideas</span>
        <span>© {new Date().getFullYear()} — Divulgación de reflexiones e ideas</span>
      </div>
    </footer>
  );
}
