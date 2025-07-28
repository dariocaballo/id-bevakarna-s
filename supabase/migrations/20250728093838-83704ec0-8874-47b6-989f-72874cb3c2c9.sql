-- Create an initial admin user with email admin@company.com
-- Note: This is just a profile entry. The user will need to sign up with this email to get admin access.
-- You can change the email in the handle_new_user function to match your desired admin email.

-- Update the function to use a different admin email if needed
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public', 'auth'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, role)
  VALUES (
    NEW.id, 
    NEW.email,
    CASE 
      -- Change this email to your desired admin email
      WHEN NEW.email = 'admin@idguards.com' THEN 'admin'
      ELSE 'user'
    END
  );
  RETURN NEW;
END;
$$;