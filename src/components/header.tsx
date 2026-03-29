export function Header({ title }: { title: string }) {
  return (
    <header className="h-14 border-b border-zinc-800 flex items-center px-6">
      <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
    </header>
  );
}
