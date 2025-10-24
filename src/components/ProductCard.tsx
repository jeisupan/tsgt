import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
}

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export const ProductCard = ({ product, onAddToCart }: ProductCardProps) => {
  return (
    <Card className="group cursor-pointer overflow-hidden border-border bg-card transition-all duration-300 hover:shadow-[var(--shadow-hover)]">
      <div className="aspect-square overflow-hidden bg-muted">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
      </div>
      <div className="p-4">
        <div className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {product.category}
        </div>
        <h3 className="mb-2 font-semibold text-foreground text-lg">{product.name}</h3>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-primary">
            ${product.price.toFixed(2)}
          </span>
          <Button
            size="icon"
            className="rounded-full bg-gradient-to-br from-primary to-secondary hover:shadow-lg transition-all"
            onClick={() => onAddToCart(product)}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
