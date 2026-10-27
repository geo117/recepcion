export default function GYJBadge({ estado }) {
  const esDentro = estado === "dentro";
  return (
    <span className={`gyj-badge ${esDentro ? "gyj-badge--dentro" : "gyj-badge--salio"}`}>
      {esDentro ? "Dentro" : "Salió"}
    </span>
  );
}
