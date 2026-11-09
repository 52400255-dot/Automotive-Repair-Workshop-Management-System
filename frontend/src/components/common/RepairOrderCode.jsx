export default function RepairOrderCode({ id }) {
  if (id == null || id === '') return null;

  return <span className="repair-order-code">#{id}</span>;
}
