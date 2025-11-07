import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  details?: string;
}

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  availableStock?: number;
  onEdit?: (product: Product) => void;
}

export const ProductCard = ({ product, onAddToCart, availableStock = 0, onEdit }: ProductCardProps) => {
  const isOutOfStock = availableStock <= 0;
  const isPlaceholder = product.image.includes('placeholder-upload');
  
  return (
    <Card className={`group cursor-pointer overflow-hidden border-border bg-card transition-all duration-300 hover:shadow-[var(--shadow-hover)] ${isOutOfStock ? 'opacity-60' : ''}`}>
      <div className="aspect-square overflow-hidden bg-muted relative">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        {isOutOfStock && (
          <div className={`absolute inset-0 bg-black/50 flex justify-center ${isPlaceholder ? 'items-end pb-8' : 'items-center'}`}>
            <span className="text-white font-bold text-lg">OUT OF STOCK</span>
          </div>
        )}
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(product);
            }}
            className="absolute bottom-2 right-2 p-2 bg-background/90 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
            title="Edit product"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {product.category}
          </span>
          <span className={`text-xs font-medium ${isOutOfStock ? 'text-destructive' : 'text-accent'}`}>
            Stock: {availableStock}
          </span>
        </div>
        <h3 className="mb-1 font-semibold text-foreground text-lg">{product.name}</h3>
        {product.details && (
          <p className="mb-2 text-sm text-muted-foreground">{product.details}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-primary">
            ₱{product.price.toFixed(2)}
          </span>
          <Button
            size="icon"
            className="rounded-full bg-gradient-to-br from-primary to-secondary hover:shadow-lg transition-all"
            onClick={() => onAddToCart(product)}
            disabled={isOutOfStock}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
