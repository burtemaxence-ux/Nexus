-- ============================================================
-- 002a — Helper is_manager() (correction d'ordre, audit C4)
-- ============================================================
-- Les policies RLS des migrations 003 à 006 appellent public.is_manager(),
-- mais la fonction n'était définie qu'en 015. Un rejeu du dépôt sur une base
-- vierge échouait donc dès 003 ("function public.is_manager() does not exist"),
-- ce qui rendait le schéma du dépôt non reproductible — et donc invérifiable.
--
-- La définition ci-dessous est identique à celle de 015 (laissée en place :
-- son CREATE OR REPLACE est idempotent et rejoue la même définition).
-- Aucun changement de comportement, uniquement un changement d'ordre.

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('manager', 'supervisor')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_manager() TO authenticated;
