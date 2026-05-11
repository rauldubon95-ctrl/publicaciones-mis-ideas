export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 mt-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 text-center text-sm text-gray-400">
        <p>© {new Date().getFullYear()} Mis Ideas · Sistema de divulgación de reflexiones</p>
      </div>
    </footer>
  );
}
