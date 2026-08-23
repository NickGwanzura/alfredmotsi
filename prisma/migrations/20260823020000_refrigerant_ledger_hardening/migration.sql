ALTER TYPE "RefrigerantType" ADD VALUE IF NOT EXISTS 'R-404A';
ALTER TYPE "RefrigerantType" ADD VALUE IF NOT EXISTS 'R-507A';
ALTER TYPE "RefrigerantType" ADD VALUE IF NOT EXISTS 'R-1234yf';
ALTER TYPE "RefrigerantType" ADD VALUE IF NOT EXISTS 'R-438A';

ALTER TYPE "RefrigerantMovementType" ADD VALUE IF NOT EXISTS 'disposed';
ALTER TYPE "RefrigerantMovementType" ADD VALUE IF NOT EXISTS 'lost';
ALTER TYPE "RefrigerantMovementType" ADD VALUE IF NOT EXISTS 'transfer_out';
ALTER TYPE "RefrigerantMovementType" ADD VALUE IF NOT EXISTS 'transfer_in';
