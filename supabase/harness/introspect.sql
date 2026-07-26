-- ============================================================================
-- Signature normalisée du schéma `public` — sert à comparer deux bases.
-- Une ligne = un objet. Le tri et le formatage sont identiques des deux côtés
-- pour qu'un `diff` textuel soit significatif.
--
-- Local :  psql -Aqt -d replay -f supabase/harness/introspect.sql > /tmp/local.txt
-- Prod  :  même requête via MCP execute_sql, puis diff.
-- ============================================================================
\pset format unaligned
\pset tuples_only on
\pset footer off

-- Les expressions de policies sont stockées « jolies » (retours à la ligne) :
-- on écrase tout blanc en espace simple pour garantir une ligne par objet.
SELECT regexp_replace(btrim(sig), '\s+', ' ', 'g') FROM (

  -- Colonnes
  SELECT format('COLUMN %s.%s %s null=%s default=%s',
                table_name, column_name, data_type, is_nullable,
                COALESCE(column_default, '-')) AS sig
  FROM information_schema.columns WHERE table_schema = 'public'

  UNION ALL
  -- Tables + état RLS
  SELECT format('TABLE %s rls=%s', c.relname, c.relrowsecurity)
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'

  UNION ALL
  -- Policies
  SELECT format('POLICY %s.%s cmd=%s roles=%s using=%s check=%s',
                tablename, policyname, cmd, array_to_string(roles, ','),
                COALESCE(qual, '-'), COALESCE(with_check, '-'))
  FROM pg_policies WHERE schemaname = 'public'

  UNION ALL
  -- Fonctions (signature + volatilité + security definer)
  SELECT format('FUNCTION %s(%s) sec_def=%s',
                p.proname, pg_get_function_identity_arguments(p.oid), p.prosecdef)
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'

  UNION ALL
  -- Index
  SELECT format('INDEX %s', indexdef)
  FROM pg_indexes WHERE schemaname = 'public'

  UNION ALL
  -- Contraintes
  SELECT format('CONSTRAINT %s.%s %s', c.relname, con.conname, pg_get_constraintdef(con.oid))
  FROM pg_constraint con
  JOIN pg_class c ON c.oid = con.conrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'

  UNION ALL
  -- Triggers
  SELECT format('TRIGGER %s', pg_get_triggerdef(t.oid))
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE NOT t.tgisinternal AND (n.nspname = 'public' OR c.relname = 'users')

  UNION ALL
  -- Privilèges de table pour les rôles exposés au navigateur
  SELECT format('GRANT %s %s %s', table_name, grantee, privilege_type)
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated')

  UNION ALL
  -- EXECUTE effectif sur les fonctions (piège 083 : l'héritage via PUBLIC)
  SELECT format('EXEC %s(%s) anon=%s authenticated=%s',
                p.proname, pg_get_function_identity_arguments(p.oid),
                has_function_privilege('anon', p.oid, 'EXECUTE'),
                has_function_privilege('authenticated', p.oid, 'EXECUTE'))
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'

) s ORDER BY sig;
