REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.network_config FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.network_config FROM authenticated;
REVOKE ALL ON public.network_config FROM public;
GRANT SELECT ON public.network_config TO anon, authenticated;
GRANT ALL ON public.network_config TO service_role;