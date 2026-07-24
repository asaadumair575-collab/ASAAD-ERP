UPDATE "EcomOrderItem" SET "packSize" = 3  WHERE "description" ~* 'pack\s*of\s*3[^0-9]' OR "description" ~* 'pack\s*of\s*3$';
UPDATE "EcomOrderItem" SET "packSize" = 6  WHERE "description" ~* 'pack\s*of\s*6[^0-9]' OR "description" ~* 'pack\s*of\s*6$';
UPDATE "EcomOrderItem" SET "packSize" = 12 WHERE "description" ~* 'pack\s*of\s*12';
