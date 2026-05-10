type Props = {
  name: string;
  className?: string;
  filled?: boolean;
};

export function Icon({ name, className = "", filled = false }: Props) {
  return (
    <span
      className={`material-symbols-outlined select-none ${className}`}
      style={
        filled ? { fontVariationSettings: "'FILL' 1, 'wght' 400" } : undefined
      }
    >
      {name}
    </span>
  );
}
