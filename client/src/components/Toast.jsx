export default function Toast({ text, type }) {
  return (
    <div className={`toast ${type}`}>
      {text}
    </div>
  );
}
