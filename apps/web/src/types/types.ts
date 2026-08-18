export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  variant: "primary" | "accent" | "secondary";
  href: string;
}