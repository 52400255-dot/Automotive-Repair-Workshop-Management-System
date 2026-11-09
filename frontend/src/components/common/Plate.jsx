export default function Plate({ value }) {
  if (!value) return null;

  return (
    <span className="plate" aria-label={`Biển số xe ${value}`}>
      {value}
    </span>
  );
}
