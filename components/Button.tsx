import { ReactNode } from "react";

type ButtonProps = {
  children: ReactNode;
  base?: string;
  styles?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | string;
};

export default function Button({ children, base = "", styles = "", onClick, variant }: ButtonProps) {
  const variantClass = variant ? `btn-${variant}` : "";
  return (
    <button className={`${base} ${styles} ${variantClass}`} onClick={onClick}>
      {children}
    </button>
  );
}
