export function Panel({ title, children, className = '', style = {} }) {
  return (
    <section className={`panel ${className}`} style={style}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
