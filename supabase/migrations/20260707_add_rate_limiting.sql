-- Create the rate limits table
CREATE TABLE IF NOT EXISTS api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(identifier, endpoint)
);

-- Enable RLS (allow nothing by default, only service_role can bypass)
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Create the highly optimized RPC function
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_endpoint TEXT,
  p_max_requests INT,
  p_window_seconds INT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_record RECORD;
BEGIN
  -- Find the current window record for this user/endpoint
  SELECT * INTO v_record
  FROM api_rate_limits
  WHERE identifier = p_identifier AND endpoint = p_endpoint;

  -- If no record exists, they've never hit this endpoint. Create one and allow.
  IF NOT FOUND THEN
    INSERT INTO api_rate_limits (identifier, endpoint, request_count, window_start)
    VALUES (p_identifier, p_endpoint, 1, NOW());
    RETURN TRUE; 
  END IF;

  -- If the record exists, check if their time window has expired
  IF NOW() > v_record.window_start + (p_window_seconds || ' seconds')::interval THEN
    -- Reset the window and start counting from 1 again
    UPDATE api_rate_limits
    SET request_count = 1, window_start = NOW()
    WHERE identifier = p_identifier AND endpoint = p_endpoint;
    RETURN TRUE; 
  END IF;

  -- They are still within the time window. Check if they hit the max limit.
  IF v_record.request_count >= p_max_requests THEN
    RETURN FALSE; -- BLOCKED!
  END IF;

  -- They are within the time window but haven't hit the limit yet. Increment counter.
  UPDATE api_rate_limits
  SET request_count = request_count + 1
  WHERE identifier = p_identifier AND endpoint = p_endpoint;
  
  RETURN TRUE; -- ALLOWED
END;
$$;
