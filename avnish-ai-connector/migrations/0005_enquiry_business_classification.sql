-- Add business classification to existing AVNISH AI enquiries.
ALTER TABLE enquiries ADD COLUMN business_type TEXT NOT NULL DEFAULT 'Other';
ALTER TABLE enquiries ADD COLUMN business_sector TEXT NOT NULL DEFAULT 'Other';
