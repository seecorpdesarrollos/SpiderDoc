export default function CargandoAjustes() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8 pb-28">
      <div className="esqueleto h-7 w-28" />
      <div className="esqueleto mt-2 h-3 w-48" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="card-surface mt-4 p-5">
          <div className="esqueleto h-2.5 w-20" />
          <div className="esqueleto mt-3 h-4 w-56" />
          <div className="esqueleto mt-3 h-3 w-full" />
          <div className="esqueleto mt-2 h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}
