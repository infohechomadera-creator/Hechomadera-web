"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

interface Props {
  productId: string;
  productName: string;
  price: number;
}

export function ProductViewTracker({ productId, productName, price }: Props) {
  useEffect(() => {
    track("product_view", { id: productId, name: productName, price });
  }, [productId, productName, price]);

  return null;
}
