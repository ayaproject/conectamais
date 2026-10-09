-- Integridade de preço no próprio banco, além da validação no servidor.
ALTER TABLE "services"
  ADD CONSTRAINT "services_price_non_negative" CHECK ("priceCents" IS NULL OR "priceCents" >= 0),
  ADD CONSTRAINT "services_fixed_price_required" CHECK (
    ("pricingMode" = 'FIXED' AND "priceCents" IS NOT NULL AND "priceUnit" IS NOT NULL)
    OR ("pricingMode" = 'QUOTE' AND "priceCents" IS NULL)
  );
